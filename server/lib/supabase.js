const { createClient } = require('@supabase/supabase-js');

let _client = null;

// Fallback values for deployment
const FALLBACK_URL = 'https://foqrpkojdxoshahzsscm.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcXJwa29qZHhvc2hhaHpzc2NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MjQyOCwiZXhwIjoyMDkwNjM4NDI4fQ.mJwykQy0OqPWonxrbeNIPYxIf_BghI235u6xJQP-AKQ';

function getSupabase() {
  if (!_client) {
    const url = process.env.SUPABASE_URL || FALLBACK_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_KEY;
    _client = createClient(url, key);
  }
  return _client;
}

module.exports = { getSupabase };
