// Generate bcrypt hash for any password
// Usage: node generate-custom-hash.js yourpassword

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'password123';
const saltRounds = 10;

if (!process.argv[2]) {
  console.log('\nUsage: node generate-custom-hash.js <your-password>');
  console.log('Using default password: password123\n');
}

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }

  console.log('='.repeat(60));
  console.log('BCRYPT HASH GENERATED');
  console.log('='.repeat(60));
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('='.repeat(60));
  console.log('\nCopy the hash above and run this SQL in Supabase:\n');
  console.log(`UPDATE professors SET password_hash = '${hash}' WHERE email = 'professor@test.com';`);
  console.log('\n' + '='.repeat(60));
  console.log('\nOR insert a new professor:\n');
  console.log(`INSERT INTO professors (name, email, password_hash) VALUES ('Dr. Test', 'professor@test.com', '${hash}');`);
  console.log('\n' + '='.repeat(60));
});
