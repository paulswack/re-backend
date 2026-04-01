const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// GET /api/listings — all listings for team
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, agent_id } = req.query;
    let query = supabase
      .from('listings')
      .select('*, listing_parties(*)')
      .eq('team_id', req.user.teamId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (agent_id) query = query.eq('agent_id', agent_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, listing_parties(*)')
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Listing not found' });
    res.json(data);
  } catch (err) {
    console.error('GET listing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings
router.post('/', requireAuth, async (req, res) => {
  try {
    const { parties, ...fields } = req.body;
    fields.team_id = req.user.teamId;

    const { data, error } = await supabase
      .from('listings')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;

    if (parties && parties.length > 0) {
      const partyRows = parties.map(p => ({ ...p, listing_id: data.id }));
      await supabase.from('listing_parties').insert(partyRows);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { parties, ...fields } = req.body;
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('listings')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;

    if (parties) {
      await supabase.from('listing_parties').delete().eq('listing_id', req.params.id);
      if (parties.length > 0) {
        const partyRows = parties.map(p => ({ ...p, listing_id: req.params.id }));
        await supabase.from('listing_parties').insert(partyRows);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('PUT listing error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
