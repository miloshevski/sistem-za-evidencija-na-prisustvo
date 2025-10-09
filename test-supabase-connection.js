// Test Supabase connection and permissions
// Run with: node test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('='.repeat(70));
console.log('TESTING SUPABASE CONNECTION');
console.log('='.repeat(70));

// Check environment variables
console.log('\n1. Checking environment variables:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ ERROR: Missing required environment variables');
  console.log('Make sure .env.local exists and contains all required variables');
  process.exit(1);
}

console.log('\n2. Service Role Key (first 20 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
console.log('   Anon Key (first 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...');

// Test with anon key
console.log('\n3. Testing with ANON key:');
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

supabaseAnon
  .from('professors')
  .select('count')
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ Anon key error:', error.message);
    } else {
      console.log('   ✓ Anon key works (but may not have RLS permissions)');
    }
  });

// Test with service role key
console.log('\n4. Testing with SERVICE ROLE key:');
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testServiceRole() {
  console.log('\n5. Attempting to query professors table...');

  const { data, error, count } = await supabaseAdmin
    .from('professors')
    .select('*', { count: 'exact' });

  if (error) {
    console.log('   ❌ ERROR:', error.message);
    console.log('   Error code:', error.code);
    console.log('   Error details:', error.details);
    console.log('   Error hint:', error.hint);
    console.log('\n   LIKELY CAUSES:');
    console.log('   1. Wrong SERVICE_ROLE_KEY in .env.local');
    console.log('   2. SERVICE_ROLE_KEY is actually the anon key');
    console.log('   3. Typo in the key (extra spaces, quotes, etc)');
    console.log('\n   HOW TO FIX:');
    console.log('   - Go to Supabase Dashboard > Settings > API');
    console.log('   - Copy the "service_role" key (NOT the anon key)');
    console.log('   - Make sure to click "Reveal" to see the full key');
    console.log('   - Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.log('   - Restart your dev server (npm run dev)');
  } else {
    console.log('   ✓ SUCCESS! Service role key works');
    console.log('   Found', count, 'professor(s) in database');
    if (data && data.length > 0) {
      console.log('\n   Professors found:');
      data.forEach((prof, i) => {
        console.log(`   ${i + 1}. ${prof.name} (${prof.email})`);
      });
    } else {
      console.log('\n   ⚠ No professors in database. Run this SQL:');
      console.log('   INSERT INTO professors (name, email, password_hash) VALUES');
      console.log('   (\'Dr. Test\', \'professor@test.com\', \'$2a$10$uRFcUeopc65GHPnjC.xFleKZLpXzrOU/WLxtfI0IUx85mZXesXJCu\');');
    }
  }

  console.log('\n' + '='.repeat(70));
}

testServiceRole();
