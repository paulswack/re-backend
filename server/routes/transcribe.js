const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const { Readable } = require('stream');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max

const OPENAI_KEY = process.env.OPENAI_API_KEY;

let openai = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: OPENAI_KEY });
  }
  return openai;
}

// POST /api/transcribe — upload audio, get transcription + AI summary
router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const ai = getOpenAI();

    // Convert buffer to a File-like object for OpenAI
    const file = new File([req.file.buffer], 'recording.webm', { type: req.file.mimetype || 'audio/webm' });

    // Step 1: Transcribe with Whisper
    const transcription = await ai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en'
    });

    const transcript = transcription.text;

    // Step 2: Summarize with GPT
    const summary = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an assistant that summarizes real estate team meeting notes. Extract the following from the meeting transcript and return JSON with these fields: wins (string - what went well), challenges (string - obstacles or issues), goals (string - goals discussed), actionItems (array of strings - specific action items to follow up on), notes (string - any other important notes or context). Keep each section concise but thorough. If a section has no content, use an empty string or empty array.'
        },
        {
          role: 'user',
          content: 'Here is the meeting transcript:\n\n' + transcript
        }
      ],
      response_format: { type: 'json_object' }
    });

    let parsed = {};
    try {
      parsed = JSON.parse(summary.choices[0].message.content);
    } catch (e) {
      parsed = { notes: summary.choices[0].message.content };
    }

    res.json({
      transcript: transcript,
      summary: {
        wins: parsed.wins || '',
        challenges: parsed.challenges || '',
        goals: parsed.goals || '',
        actionItems: parsed.actionItems || [],
        notes: parsed.notes || ''
      }
    });
  } catch (err) {
    console.error('Transcription error:', err.message || err);
    res.status(500).json({ error: 'Transcription failed: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
