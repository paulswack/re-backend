const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabase');
const { generateToken, requireAuth } = require('../lib/auth');

const router = express.Router();
const DEV_CODE = process.env.DEV_ACCESS_CODE || 'REBACKOFFICE-ADMIN-2026';

// POST /api/auth/register — create a new team + team lead
router.post('/register', async (req, res) => {
  try {
    const { teamName, displayName, username, password, plan, accessCode } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Username, password, and display name are required' });
    }

    // Determine account type
    let accountType = 'paid';
    if (accessCode === DEV_CODE) {
      accountType = 'admin_free';
    }

    // Create team
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({
        name: teamName || displayName + "'s Team",
        plan: plan || 'trial',
        account_type: accountType,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString() // 1 day trial
      })
      .select()
      .single();

    if (teamErr) throw teamErr;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create team lead user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({
        team_id: team.id,
        username,
        password_hash: passwordHash,
        display_name: displayName,
        role: 'Team Lead'
      })
      .select()
      .single();

    if (userErr) {
      // Clean up team if user creation fails
      await supabase.from('teams').delete().eq('id', team.id);
      if (userErr.code === '23505') {
        return res.status(400).json({ error: 'Username already taken' });
      }
      throw userErr;
    }

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      teamId: team.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role
    });

    // Seed default checklist templates
    await seedDefaults(team.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        teamId: team.id,
        teamName: team.name,
        plan: team.plan,
        accountType: team.account_type
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, accessCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*, teams(*)')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Apply dev access code if provided
    if (accessCode === DEV_CODE && user.teams) {
      await supabase
        .from('teams')
        .update({ account_type: 'admin_free' })
        .eq('id', user.team_id);
      user.teams.account_type = 'admin_free';
    }

    // Check subscription status
    const team = user.teams;
    let subscriptionStatus = 'active';
    if (team.account_type === 'admin_free' || team.account_type === 'free') {
      subscriptionStatus = 'active';
    } else if (team.plan === 'trial') {
      if (new Date(team.trial_ends_at) < new Date()) {
        subscriptionStatus = 'expired';
      }
    }

    const token = generateToken({
      userId: user.id,
      teamId: user.team_id,
      username: user.username,
      displayName: user.display_name,
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        teamId: user.team_id,
        teamName: team.name,
        plan: team.plan,
        accountType: team.account_type,
        subscriptionStatus
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*, teams(*)')
      .eq('id', req.user.userId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photo_url,
      teamId: user.team_id,
      teamName: user.teams?.name,
      plan: user.teams?.plan,
      accountType: user.teams?.account_type
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Seed default data for new teams
async function seedDefaults(teamId) {
  // Default checklist templates
  const templates = [
    { team_id: teamId, name: 'Buyer Closing Checklist', category: 'escrow', sort_order: 0 },
    { team_id: teamId, name: 'New Listing Checklist', category: 'listing', sort_order: 1 }
  ];

  for (const tpl of templates) {
    const { data: template } = await supabase
      .from('checklist_templates')
      .insert(tpl)
      .select()
      .single();

    if (!template) continue;

    const items = tpl.category === 'escrow'
      ? ['Open escrow', 'Deposit earnest money', 'Order inspections', 'Review disclosures', 'Negotiate repairs', 'Order appraisal', 'Loan approval', 'Remove contingencies', 'Final walkthrough', 'Sign closing docs']
      : ['Listing agreement signed', 'Order inspections', 'Prelim & NHD', 'Complete disclosures', 'Agent visual inspection', 'Stage home', 'Professional photos', 'Go live on MLS'];

    await supabase.from('checklist_template_items').insert(
      items.map((label, i) => ({
        template_id: template.id,
        label,
        sort_order: i
      }))
    );
  }
}

module.exports = router;
