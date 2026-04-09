const express = require('express');
const { requireAuth } = require('../lib/auth');
const { sendEmail, dealUpdateEmail, reviewRequestEmail, deadlineReminderEmail } = require('../lib/email');

const router = express.Router();

// POST /api/email/deal-update — send deal update to client
router.post('/deal-update', requireAuth, async (req, res) => {
  const { to, clientName, address, updateTitle, updateDetail } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient email required' });

  const content = dealUpdateEmail(clientName || 'Client', address || '', updateTitle || 'Update', updateDetail || '');
  const result = await sendEmail({ to, ...content });
  res.json({ success: true, sent: !!result });
});

// POST /api/email/review-request — send review request to client
router.post('/review-request', requireAuth, async (req, res) => {
  const { to, clientName, agentName, reviewUrl, address } = req.body;
  if (!to || !reviewUrl) return res.status(400).json({ error: 'Recipient email and review URL required' });

  const content = reviewRequestEmail(clientName || 'Client', agentName || 'Your Agent', reviewUrl, address);
  const result = await sendEmail({ to, ...content });
  res.json({ success: true, sent: !!result });
});

// POST /api/email/deadline-reminder — send deadline reminders to an agent
router.post('/deadline-reminder', async (req, res) => {
  const { to, agentName, deadlines, overrides, branding } = req.body;
  if (!to || !deadlines || !deadlines.length) {
    return res.status(400).json({ error: 'to, agentName, and deadlines required' });
  }
  const content = deadlineReminderEmail(agentName || 'Agent', deadlines, overrides, branding);
  const result = await sendEmail({ to, ...content });
  res.json({ success: true, sent: !!result });
});

module.exports = router;
