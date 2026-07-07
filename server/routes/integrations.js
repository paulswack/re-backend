const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth, requireLead, generateWebhookToken, verifyToken } = require('../lib/auth');

const router = express.Router();

// ---- helpers ----
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
  return s ? 'pending' : 'pending';
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

// GET /api/integrations/lofty/token — Team Lead retrieves the team's webhook token
router.get('/lofty/token', requireAuth, requireLead, (req, res) => {
  try {
    const token = generateWebhookToken(req.user.teamId);
    res.json({ token: token });
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

    const b = req.body || {};
    const loftyId = String(b.lofty_id || b.id || b.transaction_id || '').trim();

    const mapped = {
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
      metadata: { lofty_id: loftyId, source_system: 'lofty' }
    };

    // De-dupe: update the existing row for this Lofty id, else insert
    let existing = null;
    if (loftyId) {
      const found = await getSupabase()
        .from('transactions')
        .select('id')
        .eq('team_id', teamId)
        .eq('metadata->>lofty_id', loftyId)
        .limit(1)
        .maybeSingle();
      existing = found.data;
    }

    let result;
    if (existing && existing.id) {
      result = await getSupabase()
        .from('transactions')
        .update(mapped)
        .eq('id', existing.id)
        .eq('team_id', teamId)
        .select()
        .single();
    } else {
      result = await getSupabase()
        .from('transactions')
        .insert(mapped)
        .select()
        .single();
    }
    if (result.error) throw result.error;

    res.status(200).json({ ok: true, id: result.data.id, action: existing ? 'updated' : 'created' });
  } catch (err) {
    console.error('Lofty webhook error:', err);
    res.status(500).json({ error: 'Failed to import transaction', detail: err.message || String(err) });
  }
});

module.exports = router;
