const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase URL or Key is missing. Check your .env file.');
}

// Ensure you export the instantiated client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
