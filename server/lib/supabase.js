const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Return a proxy that lazily initializes the client
module.exports = new Proxy({}, {
  get: function(target, prop) {
    return getClient()[prop];
  }
});
