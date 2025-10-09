import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Generate a random nonce
export function generateNonce(): string {
  return uuidv4();
}

// Generate a secure QR token
export function generateQRToken(sessionId: string, timestamp: number): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const data = `${sessionId}:${timestamp}:${generateNonce()}`;
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${timestamp}:${hash}`;
}

// Validate QR token format and expiry
export function validateQRTokenFormat(token: string, maxAgeSeconds: number = 10): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) {
      return false;
    }

    const now = Date.now();
    const tokenAge = (now - timestamp) / 1000;

    // Token should not be from the future (with 5s tolerance)
    if (tokenAge < -5) {
      return false;
    }

    // Token should not be too old
    if (tokenAge > maxAgeSeconds) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Generate server nonce for single-use validation
export function generateServerNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Client-side nonce generation (for browser)
export function generateClientNonce(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return uuidv4();
}
