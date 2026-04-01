const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth, requireLead } = require('../lib/auth');

const router = express.Router();

// GET /api/teams — current team info
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', req.user.teamId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Team not found' });
    res.json(data);
  } catch (err) {
    console.error('GET team error:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// PUT /api/teams — update team (Team Lead only)
router.put('/', requireAuth, requireLead, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.stripe_customer_id;
    delete fields.stripe_subscription_id;

    const { data, error } = await supabase
      .from('teams')
      .update(fields)
      .eq('id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT team error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

module.exports = router;
