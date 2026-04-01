const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// ==========================================
// REVIEW REQUESTS
// ==========================================

// GET /api/reviews/requests
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const { user_id, status } = req.query;
    let query = getSupabase()
      .from('review_requests')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET review requests error:', err);
    res.status(500).json({ error: 'Failed to fetch review requests' });
  }
});

// POST /api/reviews/requests
router.post('/requests', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;
    if (!fields.user_id) fields.user_id = req.user.userId;

    const { data, error } = await getSupabase()
      .from('review_requests')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST review request error:', err);
    res.status(500).json({ error: 'Failed to create review request' });
  }
});

// PUT /api/reviews/requests/:id
router.put('/requests/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await getSupabase()
      .from('review_requests')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT review request error:', err);
    res.status(500).json({ error: 'Failed to update review request' });
  }
});

// DELETE /api/reviews/requests/:id
router.delete('/requests/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('review_requests')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE review request error:', err);
    res.status(500).json({ error: 'Failed to delete review request' });
  }
});

// ==========================================
// REVIEW SCORES
// ==========================================

// GET /api/reviews/scores — get scores for a user
router.get('/scores', requireAuth, async (req, res) => {
  try {
    const userId = req.query.user_id || req.user.userId;

    const { data, error } = await getSupabase()
      .from('review_scores')
      .select('*')
      .eq('user_id', userId)
      .order('platform');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET review scores error:', err);
    res.status(500).json({ error: 'Failed to fetch review scores' });
  }
});

// POST /api/reviews/scores — upsert a score
router.post('/scores', requireAuth, async (req, res) => {
  try {
    const { user_id, platform, review_count, avg_rating, goal } = req.body;
    const targetUserId = user_id || req.user.userId;

    const { data, error } = await getSupabase()
      .from('review_scores')
      .upsert({
        user_id: targetUserId,
        platform,
        review_count: review_count ?? 0,
        avg_rating: avg_rating ?? 0,
        goal: goal ?? 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('POST review score error:', err);
    res.status(500).json({ error: 'Failed to save review score' });
  }
});

// DELETE /api/reviews/scores/:id
router.delete('/scores/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('review_scores')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE review score error:', err);
    res.status(500).json({ error: 'Failed to delete review score' });
  }
});

// ==========================================
// REVIEW LINKS
// ==========================================

// GET /api/reviews/links
router.get('/links', requireAuth, async (req, res) => {
  try {
    const userId = req.query.user_id || req.user.userId;

    const { data, error } = await getSupabase()
      .from('review_links')
      .select('*')
      .eq('user_id', userId)
      .order('platform');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET review links error:', err);
    res.status(500).json({ error: 'Failed to fetch review links' });
  }
});

// POST /api/reviews/links — upsert a link
router.post('/links', requireAuth, async (req, res) => {
  try {
    const { user_id, platform, url, is_default } = req.body;
    const targetUserId = user_id || req.user.userId;

    const { data, error } = await getSupabase()
      .from('review_links')
      .upsert({
        user_id: targetUserId,
        platform,
        url,
        is_default: is_default ?? false
      }, { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('POST review link error:', err);
    res.status(500).json({ error: 'Failed to save review link' });
  }
});

// DELETE /api/reviews/links/:id
router.delete('/links/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('review_links')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE review link error:', err);
    res.status(500).json({ error: 'Failed to delete review link' });
  }
});

// ==========================================
// EMAIL TEMPLATES
// ==========================================

// GET /api/reviews/email-templates
router.get('/email-templates', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('email_templates')
      .select('*')
      .eq('team_id', req.user.teamId)
      .order('sort_order');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET email templates error:', err);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// POST /api/reviews/email-templates
router.post('/email-templates', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    fields.team_id = req.user.teamId;
    if (!fields.user_id) fields.user_id = req.user.userId;

    const { data, error } = await getSupabase()
      .from('email_templates')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST email template error:', err);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// PUT /api/reviews/email-templates/:id
router.put('/email-templates/:id', requireAuth, async (req, res) => {
  try {
    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;

    const { data, error } = await getSupabase()
      .from('email_templates')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT email template error:', err);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// DELETE /api/reviews/email-templates/:id
router.delete('/email-templates/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('email_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE email template error:', err);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

module.exports = router;
