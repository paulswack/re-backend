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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/misc', miscRoutes);
app.use('/api/transcribe', transcribeRoutes);

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
