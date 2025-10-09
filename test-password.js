// Test if a password matches a hash
// Usage: node test-password.js <password> <hash>

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'password123';
const hash = process.argv[3];

if (!hash) {
  console.log('\n❌ Error: You must provide a hash to test');
  console.log('\nUsage: node test-password.js <password> <hash>');
  console.log('\nExample:');
  console.log('node test-password.js password123 "$2a$10$abc123..."');
  console.log('\nTo get the hash from your database:');
  console.log('Run this SQL in Supabase: SELECT password_hash FROM professors WHERE email = \'professor@test.com\';\n');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('TESTING PASSWORD VERIFICATION');
console.log('='.repeat(60));
console.log('Password:', password);
console.log('Hash:', hash);
console.log('Hash length:', hash.length);
console.log('='.repeat(60));

bcrypt.compare(password, hash, function(err, result) {
  if (err) {
    console.error('\n❌ Error comparing password:', err);
    return;
  }

  console.log('\nResult:', result ? '✅ MATCH' : '❌ NO MATCH');

  if (result) {
    console.log('\n✅ The password matches the hash!');
    console.log('Your authentication should work.');
  } else {
    console.log('\n❌ The password does NOT match the hash!');
    console.log('\nPossible issues:');
    console.log('1. Wrong password');
    console.log('2. Hash was corrupted when inserting into DB');
    console.log('3. Extra spaces or quotes in the hash');
    console.log('\nSolution: Run generate-hash.js to create a fresh hash');
  }

  console.log('\n' + '='.repeat(60));
});
