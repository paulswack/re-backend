const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// GET /api/updates/:entityType/:entityId
router.get('/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('updates')
      .select('*')
      .eq('team_id', req.user.teamId)
      .eq('entity_type', req.params.entityType)
      .eq('entity_id', req.params.entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET updates error:', err);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});

// POST /api/updates
router.post('/', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;
    if (!fields.author_id) fields.author_id = req.user.userId;
    if (!fields.author_name) fields.author_name = req.user.displayName;

    const { data, error } = await getSupabase()
      .from('updates')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST update error:', err);
    res.status(500).json({ error: 'Failed to create update' });
  }
});

module.exports = router;
