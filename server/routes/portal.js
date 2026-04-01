const express = require('express');
const crypto = require('crypto');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// GET /api/portal/:token — public, no auth required
router.get('/:token', async (req, res) => {
  try {
    const { data: link, error } = await getSupabase()
      .from('portal_links')
      .select('*')
      .eq('token', req.params.token)
      .single();

    if (error || !link) return res.status(404).json({ error: 'Portal link not found' });

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Portal link has expired' });
    }

    // Fetch the entity (transaction or listing) with related data
    let entity = null;
    let parties = [];
    let updates = [];
    let checklists = [];

    if (link.entity_type === 'transaction') {
      const { data } = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('id', link.entity_id)
        .single();
      entity = data;

      const { data: p } = await getSupabase()
        .from('transaction_parties')
        .select('*')
        .eq('transaction_id', link.entity_id)
        .order('sort_order');
      parties = p || [];
    } else if (link.entity_type === 'listing') {
      const { data } = await getSupabase()
        .from('listings')
        .select('*')
        .eq('id', link.entity_id)
        .single();
      entity = data;

      const { data: p } = await getSupabase()
        .from('listing_parties')
        .select('*')
        .eq('listing_id', link.entity_id)
        .order('sort_order');
      parties = p || [];
    }

    // Fetch updates
    const { data: u } = await getSupabase()
      .from('updates')
      .select('*')
      .eq('entity_type', link.entity_type)
      .eq('entity_id', link.entity_id)
      .order('created_at', { ascending: false });
    updates = u || [];

    // Fetch checklists
    const { data: cl } = await getSupabase()
      .from('checklists')
      .select('*, checklist_items(*)')
      .eq('entity_type', link.entity_type)
      .eq('entity_id', link.entity_id);
    checklists = cl || [];

    // Get agent info
    let agent = null;
    const agentId = entity?.agent_id;
    if (agentId) {
      const { data: a } = await getSupabase()
        .from('users')
        .select('id, display_name, email, phone, photo_url')
        .eq('id', agentId)
        .single();
      agent = a;
    }

    res.json({
      link,
      entity,
      parties,
      updates,
      checklists,
      agent
    });
  } catch (err) {
    console.error('GET portal error:', err);
    res.status(500).json({ error: 'Failed to fetch portal data' });
  }
});

// POST /api/portal — create a portal link (authenticated)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { entity_type, entity_id, client_name, client_email, expires_at } = req.body;

    const token = crypto.randomBytes(32).toString('hex');

    const { data, error } = await getSupabase()
      .from('portal_links')
      .insert({
        team_id: req.user.teamId,
        token,
        entity_type,
        entity_id,
        client_name,
        client_email,
        created_by: req.user.userId,
        expires_at
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST portal link error:', err);
    res.status(500).json({ error: 'Failed to create portal link' });
  }
});

// GET /api/portal/links/:entityType/:entityId — get links for an entity (authenticated)
router.get('/links/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('portal_links')
      .select('*')
      .eq('team_id', req.user.teamId)
      .eq('entity_type', req.params.entityType)
      .eq('entity_id', req.params.entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET portal links error:', err);
    res.status(500).json({ error: 'Failed to fetch portal links' });
  }
});

module.exports = router;
