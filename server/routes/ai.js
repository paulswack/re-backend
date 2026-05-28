const express = require('express');
const OpenAI = require('openai');

const router = express.Router();
const OPENAI_KEY = process.env.OPENAI_API_KEY;

let openai = null;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: OPENAI_KEY });
  return openai;
}

// POST /api/ai/analyze-inspection
// Body: { text: <inspection report text> }
// Returns: { summary, majorIssues[], estimatedRepairCost, talkingPoints[], recommendations[] }
router.post('/analyze-inspection', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || text.trim().length < 80) {
      return res.status(400).json({ error: 'Please paste the full inspection report text (at least a few sentences).' });
    }
    const truncated = text.slice(0, 24000); // cap to control cost
    const ai = getOpenAI();
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a real estate transaction expert helping an agent quickly review a home inspection report. Return JSON with: summary (1-2 sentence overall condition), majorIssues (array of {title, severity:"high"|"medium"|"low", description, area:"electrical"|"plumbing"|"hvac"|"structural"|"roof"|"safety"|"cosmetic"|"appliance"|"other"}), estimatedRepairCost (rough range as string, e.g. "$5,000-$15,000"), talkingPoints (array of short negotiation points the buyer\'s agent could raise), recommendations (array of specific next steps for the agent). Be concise. Focus on actionable items.'
        },
        {
          role: 'user',
          content: 'Inspection report:\n\n' + truncated
        }
      ],
      response_format: { type: 'json_object' }
    });
    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      parsed = { summary: completion.choices[0].message.content };
    }
    res.json({
      summary: parsed.summary || '',
      majorIssues: Array.isArray(parsed.majorIssues) ? parsed.majorIssues : [],
      estimatedRepairCost: parsed.estimatedRepairCost || '',
      talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    });
  } catch (err) {
    console.error('Inspection analysis error:', err.message || err);
    res.status(500).json({ error: 'Analysis failed: ' + (err.message || 'Unknown error') });
  }
});

// POST /api/ai/risk-flags
// Body: { deal: { ...context } }
// Returns: { risks: [{ severity, title, message, action }] }
router.post('/risk-flags', async (req, res) => {
  try {
    const { deal } = req.body || {};
    if (!deal) return res.status(400).json({ error: 'Missing deal context.' });

    const context = JSON.stringify(deal).slice(0, 9000);
    const today = new Date().toISOString().split('T')[0];

    const ai = getOpenAI();
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a senior real estate transaction coordinator. Given a deal\'s context, identify the top 3-5 risks or items the agent should be acting on right now. Return JSON with: risks (array of {severity:"high"|"medium"|"low", title (6 words max), message (1 sentence on why it matters), action (one specific next step, 8 words max)}). Focus on approaching deadlines, missing critical data, stalled progress, and tasks commonly forgotten at this deal stage. Do not invent facts not present in the context. If everything looks healthy, return an empty array.'
        },
        {
          role: 'user',
          content: 'Today is ' + today + '.\n\nDeal context (JSON):\n' + context
        }
      ],
      response_format: { type: 'json_object' }
    });
    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      parsed = { risks: [] };
    }
    res.json({ risks: Array.isArray(parsed.risks) ? parsed.risks : [] });
  } catch (err) {
    console.error('Risk flag error:', err.message || err);
    res.status(500).json({ error: 'Risk analysis failed: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
