// Load .env file for local dev (Railway injects env vars directly)
try { require('dotenv').config({ path: __dirname + '/.env' }); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const transactionRoutes = require('./routes/transactions');
const listingRoutes = require('./routes/listings');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const checklistRoutes = require('./routes/checklists');
const portalRoutes = require('./routes/portal');
const marketingRoutes = require('./routes/marketing');
const reviewRoutes = require('./routes/reviews');
const updateRoutes = require('./routes/updates');
const miscRoutes = require('./routes/misc');
const transcribeRoutes = require('./routes/transcribe');
const billingRoutes = require('./routes/billing');
const emailRoutes = require('./routes/email');
const aiRoutes = require('./routes/ai');
const integrationRoutes = require('./routes/integrations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Parse JSON for all routes except Stripe webhook (needs raw body)
app.use(function (req, res, next) {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
// Also accept form-encoded bodies (e.g. some Zapier webhook posts)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files — no caching so updates are immediate
app.use(express.static(path.join(__dirname, '..'), {
  etag: false,
  lastModified: false,
  setHeaders: function (res, path) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

const { requireAuth, requireActiveSubscription } = require('./lib/auth');

// API Routes — auth and portal are public, everything else requires auth + active subscription
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/transactions', requireAuth, requireActiveSubscription, transactionRoutes);
app.use('/api/listings', requireAuth, requireActiveSubscription, listingRoutes);
app.use('/api/users', requireAuth, requireActiveSubscription, userRoutes);
app.use('/api/settings', requireAuth, requireActiveSubscription, settingsRoutes);
app.use('/api/checklists', requireAuth, requireActiveSubscription, checklistRoutes);
app.use('/api/marketing', requireAuth, requireActiveSubscription, marketingRoutes);
app.use('/api/reviews', requireAuth, requireActiveSubscription, reviewRoutes);
app.use('/api/updates', requireAuth, requireActiveSubscription, updateRoutes);
app.use('/api/misc', requireAuth, requireActiveSubscription, miscRoutes);
app.use('/api/transcribe', requireAuth, requireActiveSubscription, transcribeRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/email', requireAuth, emailRoutes);
app.use('/api/ai', requireAuth, requireActiveSubscription, aiRoutes);
// Integrations: inbound webhook is token-authenticated inside the route (no JWT)
app.use('/api/integrations', integrationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for non-API, non-file routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RE Back Office server running on port ${PORT}`);
});
