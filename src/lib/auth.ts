import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production');

export interface JWTPayload {
  professorId: string;
  email: string;
  name: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create JWT token
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Authenticate professor
export async function authenticateProfessor(email: string, password: string): Promise<{ token: string; professor: any } | null> {
  const { data: professor, error } = await supabaseAdmin
    .from('professors')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !professor) {
    return null;
  }

  const isValid = await verifyPassword(password, professor.password_hash);
  if (!isValid) {
    return null;
  }

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
export async function getProfessorFromToken(token: string): Promise<any | null> {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const { data: professor, error } = await supabaseAdmin
    .from('professors')
    .select('id, name, email')
    .eq('id', payload.professorId)
    .single();

  if (error || !professor) {
    return null;
  }

  return professor;
}
