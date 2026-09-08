const express = require('express');
const multer = require('multer');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max

const BUCKET = 'uploads';
let _bucketReady = false;

// Create the public bucket on first use (idempotent — ignores "already exists").
async function ensureBucket(supabase) {
  if (_bucketReady) return;
  try {
    await supabase.storage.createBucket(BUCKET, { public: true });
  } catch (e) {
    // Already exists or race — fine; a real permissions problem surfaces on upload.
  }
  _bucketReady = true;
}

function safeName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}
function randomId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// POST /api/uploads — upload a file to Supabase Storage, returns { url, name, path }.
// Files live in the cloud (not in the settings JSONB), scoped per team.
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const supabase = getSupabase();
    await ensureBucket(supabase);

    const folder = (req.body && req.body.folder) ? String(req.body.folder).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) : 'files';
    const path = req.user.teamId + '/' + (folder || 'files') + '/' + randomId() + '-' + safeName(req.file.originalname);

    const { error } = await supabase.storage.from(BUCKET).upload(path, req.file.buffer, {
      contentType: req.file.mimetype || 'application/octet-stream',
      upsert: false
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl, name: req.file.originalname, path: path });
  } catch (err) {
    console.error('Upload error:', err.message || err);
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
