const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth, requireLead } = require('../lib/auth');

const router = express.Router();

// Keys that contain sub-objects keyed by ID — need deep merge so concurrent
// users don't clobber each other's entries.
const DEEP_MERGE_KEYS = [
  '_txn_notes', '_txn_key_dates', '_listing_notes',
  '_txn_parties', '_lst_parties', '_txn_updates', '_lst_updates',
  '_deal_checklists', '_portal_links', '_tax_settings',
  '_notif_sent', '_calendar_events', '_profiles'
];

// GET /api/settings — team settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
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

// PUT /api/settings — any authenticated team member can write
// Team-lead-only keys (theme, roles, etc.) are enforced via requireLead on
// the admin-settings UI, not here, so agents can still sync their own data.
router.put('/', requireAuth, async (req, res) => {
  try {
    const incoming = req.body.settings || req.body;

    // Fetch existing settings for merge
    const { data: existing } = await getSupabase()
      .from('teams')
      .select('settings')
      .eq('id', req.user.teamId)
      .single();

    const existingSettings = existing?.settings || {};

    // Shallow merge top-level keys, but deep-merge known sub-object keys
    // so concurrent agents don't overwrite each other's notes/parties/dates.
    const merged = { ...existingSettings, ...incoming };
    DEEP_MERGE_KEYS.forEach(function (k) {
      if (incoming[k] !== undefined && existingSettings[k] && typeof existingSettings[k] === 'object' && !Array.isArray(existingSettings[k])) {
        merged[k] = { ...existingSettings[k], ...incoming[k] };
      }
    });

    const { data, error } = await getSupabase()
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

// PUT /api/settings/admin — Team Lead only (theme, roles, billing config etc.)
router.put('/admin', requireAuth, requireLead, async (req, res) => {
  try {
    const incoming = req.body.settings || req.body;

    const { data: existing } = await getSupabase()
      .from('teams')
      .select('settings')
      .eq('id', req.user.teamId)
      .single();

    const merged = { ...(existing?.settings || {}), ...incoming };

    const { data, error } = await getSupabase()
      .from('teams')
      .update({ settings: merged })
      .eq('id', req.user.teamId)
      .select('settings')
      .single();

    if (error) throw error;
    res.json(data.settings);
  } catch (err) {
    console.error('PUT settings/admin error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
