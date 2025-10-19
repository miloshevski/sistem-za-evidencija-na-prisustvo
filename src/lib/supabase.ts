import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

// Validate that we have real credentials at runtime (not build time)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Server-side runtime check
  if (supabaseUrl === 'https://placeholder.supabase.co' ||
      supabaseAnonKey === 'placeholder-anon-key' ||
      supabaseServiceRoleKey === 'placeholder-service-role-key') {
    console.warn('⚠️  Supabase credentials not properly configured. API calls will fail.');
  }
}

// Client for browser/public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface Professor {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  session_id: string;
  professor_id: string;
  start_ts: string;
  end_ts: string | null;
  prof_lat: number;
  prof_lon: number;
  is_active: boolean;
  created_at: string;
}

export interface ValidScan {
  id: string;
  session_id: string;
  student_index: string;
  name: string;
  surname: string;
  client_lat: number;
  client_lon: number;
  client_ts: string;
  scanned_at_server: string;
  distance_m: number;
  device_id: string;
  server_nonce: string;
  client_nonce: string;
  app_version: string | null;
  created_at: string;
}

export interface InvalidScan {
  id: string;
  session_id: string;
  student_index: string | null;
  name: string | null;
  surname: string | null;
  client_lat: number | null;
  client_lon: number | null;
  client_ts: string | null;
  scanned_at_server: string;
  distance_m: number | null;
  device_id: string | null;
  server_nonce: string | null;
  client_nonce: string | null;
  app_version: string | null;
  reason: string;
  qr_token: string | null;
  created_at: string;
}

export interface QRToken {
  id: string;
  session_id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface UsedServerNonce {
  server_nonce: string;
  session_id: string;
  created_at: string;
}

export interface ArchivedScan {
  id: string;
  session_id: string;
  student_index: string;
  name: string;
  surname: string;
  client_lat: number;
  client_lon: number;
  client_ts: string;
  scanned_at_server: string;
  distance_m: number;
  device_id: string;
  server_nonce: string;
  client_nonce: string;
  app_version: string | null;
  archived_at: string;
  created_at: string;
}
