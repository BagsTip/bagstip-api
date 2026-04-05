const { createClient } = require('@supabase/supabase-js');

// These should be configured in your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key is missing. Check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
