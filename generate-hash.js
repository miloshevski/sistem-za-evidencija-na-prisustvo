// Generate bcrypt hash for professor password
// Run this with: node generate-hash.js

const bcrypt = require("bcryptjs");

const password = "ace";
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function (err, hash) {
  if (err) {
    console.error("Error generating hash:", err);
    return;
  }

  console.log("=".repeat(60));
  console.log("BCRYPT HASH GENERATED");
  console.log("=".repeat(60));
  console.log("Password:", password);
  console.log("Hash:", hash);
  console.log("=".repeat(60));
  console.log("\nCopy the hash above and run this SQL in Supabase:\n");
  console.log(
    `UPDATE professors SET password_hash = '${hash}' WHERE email = 'professor@test.com';`
  );
  console.log("\n" + "=".repeat(60));
});
