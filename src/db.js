const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key is missing. Check your .env file.');
}

// Ensure the global fetch is used if available (standard in Node 18+)
// But explicitly passing it can resolve some "fetch is not defined" issues in certain environments.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: globalThis.fetch
  }
});

module.exports = supabase;
