import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from "jose";
import { supabaseAdmin } from "./supabase";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export interface ProfessorJWTPayload extends JoseJWTPayload {
  professorId: string;
  email: string;
  name: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password with full debug
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  console.log(`[DEBUG] password sent: "${password}"`);
  console.log(`[DEBUG] password hash passed to bcrypt.compare: "${hash}"`);
  console.log(`[DEBUG] hash stored in db: "${hash}"`); // just reuse the same hash

  const result = await bcrypt.compare(password, hash);

  console.log(`[DEBUG] bcrypt.compare result: ${result}`);
  return result;
}

export async function verifyPasswordWithVisibleHash(
  password: string,
  dbHash: string
): Promise<boolean> {
  // Normalize/trim to avoid hidden whitespace mismatches
  const plain = (password ?? "").toString().trim();
  const stored = (dbHash ?? "").toString().trim();

  console.log(`[DEBUG] password sent: "${plain}"`);

  // Generate a hash for the provided plaintext (for debug visibility).
  // Note: this will produce a different hash each time because bcrypt salts.
  try {
    const generatedHash = await bcrypt.hash(plain, 10);
    console.log(
      `[DEBUG] generated hash for the entered password: "${generatedHash}"`
    );
  } catch (err) {
    console.log("[DEBUG] error generating hash for entered password:", err);
  }

  // Log stored DB hash
  console.log(`[DEBUG] hash stored in db: "${stored}"`);
  console.log(`[DEBUG] (db hash length: ${stored.length})`);

  // Do the actual compare (the authoritative check)
  const match = await bcrypt.compare(plain, stored);
  console.log(`[DEBUG] bcrypt.compare result: ${match}`);

  return match;
}

// Create JWT token
export async function createToken(
  payload: ProfessorJWTPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(
  token: string
): Promise<ProfessorJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as ProfessorJWTPayload;
  } catch (error) {
    return null;
  }
}

// Authenticate professor
export async function authenticateProfessor(
  email: string,
  password: string
): Promise<{ token: string; professor: any } | null> {
  console.log("[AUTH DEBUG] Starting authentication for email:", email);

  const { data: professor, error } = await supabaseAdmin
    .from("professors")
    .select("*")
    .eq("email", email)
    .single();

  console.log("[AUTH DEBUG] Database query result:", {
    found: !!professor,
    error: error?.message,
    professorData: professor
      ? { id: professor.id, email: professor.email, name: professor.name }
      : null,
  });

  if (error || !professor) {
    console.log("[AUTH DEBUG] Professor not found in database");
    return null;
  }

  console.log("[AUTH DEBUG] Password hash from DB:", professor.password_hash);
  console.log("[AUTH DEBUG] Password received:", password);
  console.log(
    "[AUTH DEBUG] Password hash length:",
    professor.password_hash?.length
  );

  const isValid = await verifyPassword(password, professor.password_hash);

  console.log("[AUTH DEBUG] Password verification result:", isValid);

  if (!isValid) {
    console.log("[AUTH DEBUG] Password verification failed");
    return null;
  }

  console.log("[AUTH DEBUG] Authentication successful, creating token");

  const token = await createToken({
    professorId: professor.id,
    email: professor.email,
    name: professor.name,
  });

  return {
    token,
    professor: {
      id: professor.id,
      name: professor.name,
      email: professor.email,
    },
  };
}

// Get professor from token
export async function getProfessorFromToken(
  token: string
): Promise<any | null> {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const { data: professor, error } = await supabaseAdmin
    .from("professors")
    .select("id, name, email")
    .eq("id", payload.professorId)
    .single();

  if (error || !professor) {
    return null;
  }

  return professor;
}
