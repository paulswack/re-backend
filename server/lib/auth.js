const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 're-backoffice-jwt-secret-change-this-in-production';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Middleware: require valid JWT
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, teamId, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: require Team Lead role
function requireLead(req, res, next) {
  if (req.user.role !== 'Team Lead') {
    return res.status(403).json({ error: 'Team Lead access required' });
  }
  next();
}

// Middleware: check subscription is active (not expired trial)
function requireActiveSubscription(req, res, next) {
  const { getSupabase } = require('./supabase');
  getSupabase()
    .from('teams')
    .select('plan, account_type, trial_ends_at, stripe_subscription_id')
    .eq('id', req.user.teamId)
    .single()
    .then(function ({ data: team, error }) {
      if (error || !team) {
        return res.status(403).json({ error: 'Team not found' });
      }
      // Free accounts always pass
      if (team.account_type === 'admin_free' || team.account_type === 'free') {
        return next();
      }
      // Paid with active Stripe subscription passes
      if (team.stripe_subscription_id) {
        return next();
      }
      // Trial — check expiry
      if (team.plan === 'trial') {
        if (new Date(team.trial_ends_at) < new Date()) {
          return res.status(402).json({
            error: 'Trial expired',
            message: 'Your free trial has ended. Please upgrade to continue using RE Back Office.',
            expired: true
          });
        }
      }
      next();
    });
}

module.exports = { generateToken, verifyToken, requireAuth, requireLead, requireActiveSubscription };
