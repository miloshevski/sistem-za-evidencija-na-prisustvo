import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateDistance, isValidGPS } from '@/lib/gps';
import { validateQRTokenFormat } from '@/lib/crypto';

const GPS_TOLERANCE_METERS = Number(process.env.NEXT_PUBLIC_GPS_TOLERANCE_METERS) || 50;
const TIMESTAMP_TOLERANCE_SECONDS = Number(process.env.NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS) || 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id,
      token,
      server_nonce,
      student_index,
      name,
      surname,
      client_lat,
      client_lon,
      client_ts,
      device_id,
      client_nonce,
      app_version,
    } = body;

    const scanned_at_server = new Date().toISOString();

    // Validation 1: Check all required fields
    if (!session_id || !token || !server_nonce || !student_index || !name || !surname ||
        !client_lat || !client_lon || !client_ts || !device_id || !client_nonce) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          valid: false,
        },
        { status: 400 }
      );
    }

    // Validation 2: Validate GPS coordinates format
    if (!isValidGPS(client_lat, client_lon)) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: 'Invalid GPS coordinates format',
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: 'Invalid GPS coordinates format',
      });
    }

    // Validation 3: Verify session exists and is active
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: 'Session not found or inactive',
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: 'Session not found or inactive',
      });
    }

    // Validation 4: Check if device has already submitted a VALID scan for this session
    const { data: existingValidScan } = await supabaseAdmin
      .from('scans_valid')
      .select('id')
      .eq('session_id', session_id)
      .eq('device_id', device_id)
      .single();

    if (existingValidScan) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: 'Device has already submitted a valid scan for this session',
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: 'This device has already submitted a valid scan for this session',
      });
    }

    // Validation 5: Validate QR token format and check if expired
    if (!validateQRTokenFormat(token, 10)) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: 'Invalid or expired QR token',
        qr_token: token,
        distance_m: null,
      });

      return NextResponse.json({
        valid: false,
        reason: 'Invalid or expired QR token',
      });
    }

    // Validation 6: Verify token exists in database and hasn't expired
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('qr_tokens')
      .select('*')
      .eq('session_id', session_id)
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: 'QR token not found or expired in database',
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: 'QR token not found or expired',
      });
    }

    // Validation 7 removed: Server nonce check is not needed because:
    // - Validation 4 already prevents same device from scanning twice per session
    // - QR tokens expire after 10 seconds (Validation 6)
    // - Multiple students SHOULD be able to scan the same QR code

    // Validation 8: Validate timestamp (client_ts should be close to server time)
    const clientTimestamp = new Date(client_ts).getTime();
    const serverTimestamp = new Date(scanned_at_server).getTime();
    const timeDifference = Math.abs(serverTimestamp - clientTimestamp) / 1000; // in seconds

    if (timeDifference > TIMESTAMP_TOLERANCE_SECONDS) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: `Client timestamp differs from server by ${timeDifference.toFixed(1)}s (max: ${TIMESTAMP_TOLERANCE_SECONDS}s)`,
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: `Clock synchronization issue. Time difference: ${timeDifference.toFixed(1)}s`,
      });
    }

    // Validation 9: Calculate distance between student and professor
    const distance_m = calculateDistance(
      session.prof_lat,
      session.prof_lon,
      client_lat,
      client_lon
    );

    if (distance_m > GPS_TOLERANCE_METERS) {
      await logInvalidScan({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        distance_m,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
        reason: `Distance ${distance_m.toFixed(1)}m exceeds maximum ${GPS_TOLERANCE_METERS}m`,
        qr_token: token,
      });

      return NextResponse.json({
        valid: false,
        reason: `You are too far from the professor (${distance_m.toFixed(0)}m away, max ${GPS_TOLERANCE_METERS}m)`,
      });
    }

    // ALL VALIDATIONS PASSED - Insert valid scan
    const { error: insertError } = await supabaseAdmin
      .from('scans_valid')
      .insert({
        session_id,
        student_index,
        name,
        surname,
        client_lat,
        client_lon,
        client_ts,
        scanned_at_server,
        distance_m,
        device_id,
        server_nonce,
        client_nonce,
        app_version,
      });

    if (insertError) {
      console.error('Error inserting valid scan:', insertError);

      // Check if it's a unique constraint violation (device already scanned)
      if (insertError.code === '23505') {
        await logInvalidScan({
          session_id,
          student_index,
          name,
          surname,
          client_lat,
          client_lon,
          client_ts,
          scanned_at_server,
          distance_m,
          device_id,
          server_nonce,
          client_nonce,
          app_version,
          reason: 'Device has already submitted a valid scan for this session (constraint violation)',
          qr_token: token,
        });

        return NextResponse.json({
          valid: false,
          reason: 'This device has already submitted a valid scan for this session',
        });
      }

      return NextResponse.json(
        { error: 'Failed to record attendance' },
        { status: 500 }
      );
    }

    // Server nonce tracking removed - not needed because:
    // - Device tracking already prevents duplicate scans per device
    // - QR tokens expire after 10 seconds
    // - Multiple students need to scan the same QR code

    return NextResponse.json({
      valid: true,
      message: 'Attendance recorded successfully',
      distance_m: Math.round(distance_m),
    });
  } catch (error) {
    console.error('Scan submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to log invalid scans
async function logInvalidScan(data: {
  session_id: string;
  student_index: string | null;
  name: string | null;
  surname: string | null;
  client_lat: number | null;
  client_lon: number | null;
  client_ts: string | null;
  scanned_at_server: string;
  distance_m?: number | null;
  device_id: string | null;
  server_nonce: string | null;
  client_nonce: string | null;
  app_version?: string | null;
  reason: string;
  qr_token: string | null;
}) {
  try {
    await supabaseAdmin.from('scans_invalid').insert(data);
  } catch (error) {
    console.error('Error logging invalid scan:', error);
  }
}
