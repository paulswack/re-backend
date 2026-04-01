const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth, requireLead } = require('../lib/auth');

const router = express.Router();

// ==========================================
// ANNOUNCEMENTS
// ==========================================

// GET /api/misc/announcements
router.get('/announcements', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/misc/announcements (Team Lead only)
router.post('/announcements', requireAuth, requireLead, async (req, res) => {
  try {
    const { text, pinned } = req.body;
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        team_id: req.user.teamId,
        text,
        author_name: req.user.displayName,
        pinned: pinned ?? false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PUT /api/misc/announcements/:id (Team Lead only)
router.put('/announcements/:id', requireAuth, requireLead, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('announcements')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /api/misc/announcements/:id (Team Lead only)
router.delete('/announcements/:id', requireAuth, requireLead, async (req, res) => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE announcement error:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// ==========================================
// VENDORS
// ==========================================

// GET /api/misc/vendors
router.get('/vendors', requireAuth, async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('name');

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET vendors error:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// POST /api/misc/vendors
router.post('/vendors', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;

    const { data, error } = await supabase
      .from('vendors')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST vendor error:', err);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /api/misc/vendors/:id
router.put('/vendors/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('vendors')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT vendor error:', err);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /api/misc/vendors/:id
router.delete('/vendors/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE vendor error:', err);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// ==========================================
// MEETING NOTES
// ==========================================

// GET /api/misc/meeting-notes
router.get('/meeting-notes', requireAuth, async (req, res) => {
  try {
    const { agent_id } = req.query;
    let query = supabase
      .from('meeting_notes')
      .select('*, meeting_action_items(*)')
      .eq('team_id', req.user.teamId)
      .order('date', { ascending: false });

    if (agent_id) query = query.eq('agent_id', agent_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET meeting notes error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting notes' });
  }
});

// POST /api/misc/meeting-notes
router.post('/meeting-notes', requireAuth, async (req, res) => {
  try {
    const { action_items, ...fields } = req.body;
    fields.team_id = req.user.teamId;
    if (!fields.created_by) fields.created_by = req.user.userId;

    const { data, error } = await supabase
      .from('meeting_notes')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;

    if (action_items && action_items.length > 0) {
      const items = action_items.map((item, i) => ({
        meeting_id: data.id,
        label: typeof item === 'string' ? item : item.label,
        sort_order: typeof item === 'string' ? i : (item.sort_order ?? i)
      }));
      await supabase.from('meeting_action_items').insert(items);
    }

    const { data: full } = await supabase
      .from('meeting_notes')
      .select('*, meeting_action_items(*)')
      .eq('id', data.id)
      .single();

    res.status(201).json(full);
  } catch (err) {
    console.error('POST meeting note error:', err);
    res.status(500).json({ error: 'Failed to create meeting note' });
  }
});

// PUT /api/misc/meeting-notes/:id
router.put('/meeting-notes/:id', requireAuth, async (req, res) => {
  try {
    const { action_items, ...fields } = req.body;
    delete fields.id;
    delete fields.team_id;

    const { error } = await supabase
      .from('meeting_notes')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;

    if (action_items) {
      await supabase.from('meeting_action_items').delete().eq('meeting_id', req.params.id);
      if (action_items.length > 0) {
        const items = action_items.map((item, i) => ({
          meeting_id: req.params.id,
          label: typeof item === 'string' ? item : item.label,
          completed: typeof item === 'string' ? false : (item.completed ?? false),
          completed_at: item.completed_at || null,
          sort_order: typeof item === 'string' ? i : (item.sort_order ?? i)
        }));
        await supabase.from('meeting_action_items').insert(items);
      }
    }

    const { data: full } = await supabase
      .from('meeting_notes')
      .select('*, meeting_action_items(*)')
      .eq('id', req.params.id)
      .single();

    res.json(full);
  } catch (err) {
    console.error('PUT meeting note error:', err);
    res.status(500).json({ error: 'Failed to update meeting note' });
  }
});

// DELETE /api/misc/meeting-notes/:id
router.delete('/meeting-notes/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('meeting_notes')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE meeting note error:', err);
    res.status(500).json({ error: 'Failed to delete meeting note' });
  }
});

// ==========================================
// AGENT GOALS
// ==========================================

// GET /api/misc/agent-goals
router.get('/agent-goals', requireAuth, async (req, res) => {
  try {
    const { user_id, year } = req.query;

    // Get all team member IDs for scoping
    const { data: teamUsers } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', req.user.teamId);

    const userIds = (teamUsers || []).map(u => u.id);
    if (userIds.length === 0) return res.json([]);

    let query = supabase
      .from('agent_goals')
      .select('*')
      .in('user_id', userIds);

    if (user_id) query = query.eq('user_id', user_id);
    if (year) query = query.eq('year', parseInt(year));

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET agent goals error:', err);
    res.status(500).json({ error: 'Failed to fetch agent goals' });
  }
});

// POST /api/misc/agent-goals — upsert
router.post('/agent-goals', requireAuth, async (req, res) => {
  try {
    const { user_id, year, closings_goal, volume_goal } = req.body;
    const targetUserId = user_id || req.user.userId;

    const { data, error } = await supabase
      .from('agent_goals')
      .upsert({
        user_id: targetUserId,
        year,
        closings_goal: closings_goal ?? 8,
        volume_goal: volume_goal ?? 2000000
      }, { onConflict: 'user_id,year' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('POST agent goal error:', err);
    res.status(500).json({ error: 'Failed to save agent goal' });
  }
});

// PUT /api/misc/agent-goals/:id
router.put('/agent-goals/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;

    const { data, error } = await supabase
      .from('agent_goals')
      .update(fields)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT agent goal error:', err);
    res.status(500).json({ error: 'Failed to update agent goal' });
  }
});

// DELETE /api/misc/agent-goals/:id
router.delete('/agent-goals/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('agent_goals')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE agent goal error:', err);
    res.status(500).json({ error: 'Failed to delete agent goal' });
  }
});

// ==========================================
// BOLD 100 CONTACTS
// ==========================================

// GET /api/misc/bold100
router.get('/bold100', requireAuth, async (req, res) => {
  try {
    const { user_id, sprint_key } = req.query;
    let query = supabase
      .from('bold100_contacts')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    if (sprint_key) query = query.eq('sprint_key', sprint_key);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET bold100 error:', err);
    res.status(500).json({ error: 'Failed to fetch bold100 contacts' });
  }
});

// POST /api/misc/bold100
router.post('/bold100', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;
    if (!fields.user_id) fields.user_id = req.user.userId;

    const { data, error } = await supabase
      .from('bold100_contacts')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST bold100 error:', err);
    res.status(500).json({ error: 'Failed to create bold100 contact' });
  }
});

// PUT /api/misc/bold100/:id
router.put('/bold100/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('bold100_contacts')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT bold100 error:', err);
    res.status(500).json({ error: 'Failed to update bold100 contact' });
  }
});

// DELETE /api/misc/bold100/:id
router.delete('/bold100/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('bold100_contacts')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE bold100 error:', err);
    res.status(500).json({ error: 'Failed to delete bold100 contact' });
  }
});

// ==========================================
// KNOWLEDGE ARTICLES
// ==========================================

// GET /api/misc/knowledge
router.get('/knowledge', requireAuth, async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase
      .from('knowledge_articles')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET knowledge articles error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge articles' });
  }
});

// POST /api/misc/knowledge
router.post('/knowledge', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;
    if (!fields.author_id) fields.author_id = req.user.userId;

    const { data, error } = await supabase
      .from('knowledge_articles')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST knowledge article error:', err);
    res.status(500).json({ error: 'Failed to create knowledge article' });
  }
});

// PUT /api/misc/knowledge/:id
router.put('/knowledge/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('knowledge_articles')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT knowledge article error:', err);
    res.status(500).json({ error: 'Failed to update knowledge article' });
  }
});

// DELETE /api/misc/knowledge/:id
router.delete('/knowledge/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE knowledge article error:', err);
    res.status(500).json({ error: 'Failed to delete knowledge article' });
  }
});

// ==========================================
// RECRUITS
// ==========================================

// GET /api/misc/recruits
router.get('/recruits', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('recruits')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET recruits error:', err);
    res.status(500).json({ error: 'Failed to fetch recruits' });
  }
});

// POST /api/misc/recruits
router.post('/recruits', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;

    const { data, error } = await supabase
      .from('recruits')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST recruit error:', err);
    res.status(500).json({ error: 'Failed to create recruit' });
  }
});

// PUT /api/misc/recruits/:id
router.put('/recruits/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await supabase
      .from('recruits')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT recruit error:', err);
    res.status(500).json({ error: 'Failed to update recruit' });
  }
});

// DELETE /api/misc/recruits/:id
router.delete('/recruits/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('recruits')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE recruit error:', err);
    res.status(500).json({ error: 'Failed to delete recruit' });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// GET /api/misc/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('team_id', req.user.teamId)
      .or(`user_id.eq.${req.user.userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unread_only === 'true') query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/misc/notifications/:id/read — mark single as read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/misc/notifications/read-all — mark all as read for user
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('team_id', req.user.teamId)
      .or(`user_id.eq.${req.user.userId},user_id.is.null`)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('PUT notifications read-all error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
