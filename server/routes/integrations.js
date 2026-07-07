const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth, requireLead, generateWebhookToken, verifyToken } = require('../lib/auth');

const router = express.Router();

// ---- value normalizers ----
function toNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}
function normalizeStatus(s) {
  s = String(s || '').toLowerCase();
  if (/closed|sold|settled|complete|funded/.test(s)) return 'closed';
  if (/pending|under\s*contract|in\s*escrow|contract|accepted/.test(s)) return 'pending';
  if (/active|coming\s*soon|list/.test(s)) return 'active';
  return 'pending';
}
function normalizeType(t) {
  t = String(t || '').toLowerCase();
  if (/dual|both\s*sides|double/.test(t)) return 'Dual';
  if (/sell|list|seller/.test(t)) return 'Seller';
  if (/buy|buyer|purchas/.test(t)) return 'Buyer';
  return t ? (t.charAt(0).toUpperCase() + t.slice(1)) : 'Buyer';
}
function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Normalize a street address for fuzzy matching (lowercase, drop punctuation,
// collapse common suffixes/directions) so "123 Main Street" == "123 Main St".
const ADDR_ABBR = {
  street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', lane: 'ln',
  boulevard: 'blvd', court: 'ct', circle: 'cir', place: 'pl', terrace: 'ter',
  parkway: 'pkwy', highway: 'hwy', trail: 'trl', square: 'sq',
  north: 'n', south: 's', east: 'e', west: 'w',
  apartment: 'apt', suite: 'ste', unit: 'unit', building: 'bldg'
};
function normAddr(a) {
  const s = String(a || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return s.split(/\s+/).map(function (w) { return ADDR_ABBR[w] || w; }).filter(Boolean).join(' ');
}

// Map a raw Lofty record (from webhook or CSV) to our transactions columns.
function mapLoftyRow(b, teamId) {
  b = b || {};
  const loftyId = String(b.lofty_id || b.id || b.transaction_id || '').trim();
  return {
    team_id: teamId,
    address: b.address || b.property_address || '',
    city: b.city || '',
    state: b.state || '',
    zip: b.zip || b.postal_code || b.zip_code || '',
    type: normalizeType(b.type || b.transaction_type || b.side),
    status: normalizeStatus(b.status || b.stage || b.transaction_status),
    price: toNumber(b.price || b.sale_price || b.amount || b.list_price),
    agent_name: b.agent_name || b.agent || b.agent_full_name || '',
    source: b.source || b.lead_source || 'Lofty',
    close_date: toDate(b.close_date || b.closing_date || b.closed_date),
    notes: b.notes || '',
    metadata: loftyId ? { lofty_id: loftyId, source_system: 'lofty' } : { source_system: 'lofty' }
  };
}

// Build an in-memory index of the team's existing transactions for de-dup:
// by Lofty id (exact) and by normalized address (to adopt manual entries).
async function loadIndex(teamId) {
  const { data } = await getSupabase()
    .from('transactions')
    .select('id, address, metadata')
    .eq('team_id', teamId);
  const byLoftyId = {}, byAddr = {};
  (data || []).forEach(function (row) {
    const meta = row.metadata || {};
    const rec = { id: row.id, metadata: meta };
    const lid = meta.lofty_id ? String(meta.lofty_id) : '';
    if (lid) {
      byLoftyId[lid] = rec;
    } else {
      const na = normAddr(row.address);
      if (na && !(na in byAddr)) byAddr[na] = rec; // first un-linked match wins
    }
  });
  return { byLoftyId, byAddr };
}

// Create, or update in place when the incoming deal matches an existing one
// (by Lofty id first, then by address). Existing metadata is preserved.
async function upsertWithIndex(mapped, teamId, index) {
  const loftyId = mapped.metadata && mapped.metadata.lofty_id;
  let target = null, matchedManual = false;
  if (loftyId && index.byLoftyId[loftyId]) target = index.byLoftyId[loftyId];
  const na = normAddr(mapped.address);
  if (!target && na && index.byAddr[na]) { target = index.byAddr[na]; matchedManual = true; }

  let result, action;
  if (target) {
    mapped.metadata = Object.assign({}, target.metadata || {}, mapped.metadata);
    result = await getSupabase()
      .from('transactions').update(mapped)
      .eq('id', target.id).eq('team_id', teamId)
      .select('id, metadata').single();
    action = 'updated';
  } else {
    result = await getSupabase()
      .from('transactions').insert(mapped)
      .select('id, metadata').single();
    action = 'created';
  }
  if (result.error) throw result.error;

  // keep the index fresh so later rows in the same batch de-dupe correctly
  const rec = { id: result.data.id, metadata: result.data.metadata || mapped.metadata };
  if (loftyId) index.byLoftyId[loftyId] = rec;
  if (matchedManual && na) delete index.byAddr[na];            // now linked — no longer a manual candidate
  else if (action === 'created' && na && !loftyId && !(na in index.byAddr)) index.byAddr[na] = rec;
  return { id: result.data.id, action: action };
}

// Pull buyer/seller contact info out of a raw Lofty record.
function extractParties(b) {
  b = b || {};
  const out = [];
  const bn = b.buyer_name || b.buyer || '', bp = b.buyer_phone || '', be = b.buyer_email || '';
  if (bn || bp || be) out.push({ party_type: 'buyer', name: String(bn).trim(), phone: String(bp).trim(), email: String(be).trim(), sort_order: 0, metadata: { relationship: 'Primary' } });
  const sn = b.seller_name || b.seller || '', sp = b.seller_phone || '', se = b.seller_email || '';
  if (sn || sp || se) out.push({ party_type: 'seller', name: String(sn).trim(), phone: String(sp).trim(), email: String(se).trim(), sort_order: 0, metadata: { relationship: 'Primary' } });
  return out;
}

// Write parties onto a transaction. Only replaces the side(s) actually provided,
// so a buyer-only payload won't wipe an existing seller (and vice-versa).
async function syncParties(txnId, parties) {
  if (!txnId || !parties || !parties.length) return;
  const types = {};
  parties.forEach(function (p) { types[p.party_type] = true; });
  for (const ty of Object.keys(types)) {
    await getSupabase().from('transaction_parties').delete().eq('transaction_id', txnId).eq('party_type', ty);
  }
  const rows = parties.map(function (p) { return Object.assign({}, p, { transaction_id: txnId }); });
  await getSupabase().from('transaction_parties').insert(rows);
}

// GET /api/integrations/lofty/token — Team Lead retrieves the team's webhook token
router.get('/lofty/token', requireAuth, requireLead, (req, res) => {
  try {
    res.json({ token: generateWebhookToken(req.user.teamId) });
  } catch (err) {
    console.error('Lofty token error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// POST /api/integrations/lofty/transaction — inbound webhook (Zapier posts here)
// Auth is the webhook token in ?token= or X-Webhook-Token header (no JWT login).
router.post('/lofty/transaction', async (req, res) => {
  try {
    const token = req.query.token || req.headers['x-webhook-token'];
    if (!token) return res.status(401).json({ error: 'Missing webhook token' });

    let decoded;
    try { decoded = verifyToken(token); } catch (e) { return res.status(401).json({ error: 'Invalid webhook token' }); }
    if (!decoded || decoded.type !== 'lofty-webhook' || !decoded.teamId) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }
    const teamId = decoded.teamId;

    const index = await loadIndex(teamId);
    const out = await upsertWithIndex(mapLoftyRow(req.body, teamId), teamId, index);
    await syncParties(out.id, extractParties(req.body));
    res.status(200).json({ ok: true, action: out.action });
  } catch (err) {
    console.error('Lofty webhook error:', err);
    res.status(500).json({ error: 'Failed to import transaction', detail: err.message || String(err) });
  }
});

// POST /api/integrations/lofty/import — Team Lead bulk import (from a CSV upload)
router.post('/lofty/import', requireAuth, requireLead, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const teamId = req.user.teamId;
    const index = await loadIndex(teamId);
    let created = 0, updated = 0, failed = 0;
    for (const b of rows) {
      try {
        const out = await upsertWithIndex(mapLoftyRow(b, teamId), teamId, index);
        await syncParties(out.id, extractParties(b));
        if (out.action === 'updated') updated++; else created++;
      } catch (e) {
        failed++;
        console.error('Import row failed:', e.message || e);
      }
    }
    res.json({ ok: true, created, updated, failed, total: rows.length });
  } catch (err) {
    console.error('Lofty import error:', err);
    res.status(500).json({ error: 'Import failed', detail: err.message || String(err) });
  }
});

module.exports = router;
