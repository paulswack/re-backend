const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// GET /api/marketing — activities for user + period
router.get('/', requireAuth, async (req, res) => {
  try {
    const { user_id, period_key, period_type } = req.query;
    let query = getSupabase()
      .from('marketing_activities')
      .select('*')
      .eq('team_id', req.user.teamId);

    if (user_id) query = query.eq('user_id', user_id);
    if (period_key) query = query.eq('period_key', period_key);
    if (period_type) query = query.eq('period_type', period_type);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET marketing error:', err);
    res.status(500).json({ error: 'Failed to fetch marketing activities' });
  }
});

// POST /api/marketing/toggle — toggle an activity (upsert)
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const { user_id, activity_id, period_type, period_key } = req.body;
    const targetUserId = user_id || req.user.userId;

    // If toggling for another user, verify they belong to the same team
    if (targetUserId !== req.user.userId) {
      const { data: teamCheck } = await getSupabase()
        .from('users')
        .select('id')
        .eq('id', targetUserId)
        .eq('team_id', req.user.teamId)
        .single();
      if (!teamCheck) return res.status(403).json({ error: 'Access denied' });
    }

    // Check if exists
    const { data: existing } = await getSupabase()
      .from('marketing_activities')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('activity_id', activity_id)
      .eq('period_key', period_key)
      .single();

    if (existing) {
      // Delete to toggle off
      const { error } = await getSupabase()
        .from('marketing_activities')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      res.json({ toggled: false, id: existing.id });
    } else {
      // Insert to toggle on
      const { data, error } = await getSupabase()
        .from('marketing_activities')
        .insert({
          team_id: req.user.teamId,
          user_id: targetUserId,
          activity_id,
          period_type,
          period_key
        })
        .select()
        .single();

      if (error) throw error;
      res.json({ toggled: true, ...data });
    }
  } catch (err) {
    console.error('POST marketing toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle activity' });
  }
});

// PUT /api/marketing/:id/note — save note on an activity
router.put('/:id/note', requireAuth, async (req, res) => {
  try {
    const { note } = req.body;

    const { data, error } = await getSupabase()
      .from('marketing_activities')
      .update({ note })
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT marketing note error:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

module.exports = router;
