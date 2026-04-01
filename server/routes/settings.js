const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth, requireLead } = require('../lib/auth');

const router = express.Router();

// GET /api/settings — team settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('settings')
      .eq('id', req.user.teamId)
      .single();

    if (error) throw error;
    res.json(data?.settings || {});
  } catch (err) {
    console.error('GET settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — update team settings (Team Lead only)
router.put('/', requireAuth, requireLead, async (req, res) => {
  try {
    const { settings } = req.body;

    // Merge with existing settings
    const { data: existing } = await supabase
      .from('teams')
      .select('settings')
      .eq('id', req.user.teamId)
      .single();

    const merged = { ...(existing?.settings || {}), ...settings };

    const { data, error } = await supabase
      .from('teams')
      .update({ settings: merged })
      .eq('id', req.user.teamId)
      .select('settings')
      .single();

    if (error) throw error;
    res.json(data.settings);
  } catch (err) {
    console.error('PUT settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
