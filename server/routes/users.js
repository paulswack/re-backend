const express = require('express');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../lib/supabase');
const { requireAuth, requireLead } = require('../lib/auth');

const router = express.Router();

// GET /api/users — team members
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, team_id, username, display_name, role, email, phone, photo_url, license_number, brokerage, assigned_to, profile, is_active, created_at')
      .eq('team_id', req.user.teamId)
      .order('display_name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, team_id, username, display_name, role, email, phone, photo_url, license_number, brokerage, assigned_to, profile, is_active, created_at')
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) {
    console.error('GET user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users — add team member (Team Lead only)
router.post('/', requireAuth, requireLead, async (req, res) => {
  try {
    const { username, password, display_name, role, email, phone, photo_url, license_number, brokerage, assigned_to, profile } = req.body;

    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Username, password, and display name are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await getSupabase()
      .from('users')
      .insert({
        team_id: req.user.teamId,
        username,
        password_hash,
        display_name,
        role: role || 'Agent',
        email,
        phone,
        photo_url,
        license_number,
        brokerage,
        assigned_to,
        profile: profile || {}
      })
      .select('id, team_id, username, display_name, role, email, phone, photo_url, license_number, brokerage, assigned_to, profile, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Username already taken on this team' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Team Lead' || req.user.role === 'Admin';
    const isSelf = req.params.id === req.user.userId;

    // Agents can only update their own profile
    if (!isSelf && !isPrivileged) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const fields = { ...req.body };
    delete fields.id;
    delete fields.team_id;
    delete fields.password_hash;

    // Non-privileged users cannot change their own role or active status
    if (!isPrivileged) {
      delete fields.role;
      delete fields.is_active;
    }

    // If password is being changed, hash it
    if (fields.password) {
      fields.password_hash = await bcrypt.hash(fields.password, 10);
      delete fields.password;
    }

    const { data, error } = await getSupabase()
      .from('users')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select('id, team_id, username, display_name, role, email, phone, photo_url, license_number, brokerage, assigned_to, profile, is_active, created_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/users/:id/reset-password (Team Lead only)
router.post('/:id/reset-password', requireAuth, requireLead, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const password_hash = await bcrypt.hash(newPassword, 10);
    const { data, error } = await getSupabase()
      .from('users')
      .update({ password_hash })
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .select('id, username, display_name, email')
      .single();

    if (error) throw error;
    // Send password reset email if user has an email
    if (data.email) {
      const { sendEmail, passwordResetEmail } = require('../lib/email');
      const emailContent = passwordResetEmail(data.display_name, newPassword);
      sendEmail({ to: data.email, ...emailContent }).catch(() => {});
    }
    res.json({ success: true, message: 'Password reset for ' + data.display_name });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/users/:id (Team Lead only)
router.delete('/:id', requireAuth, requireLead, async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const { error } = await getSupabase()
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
