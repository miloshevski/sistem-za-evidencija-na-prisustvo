import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateServerNonce } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const professor = await getProfessorFromToken(token);

    if (!professor) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const {
      session_id,
      student_index,
      name,
      surname,
      reason,
    } = await request.json();

    if (!session_id || !student_index || !name || !surname) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify session belongs to professor
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.professor_id !== professor.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this session' },
        { status: 403 }
      );
    }

    // Create a manual override scan with special device_id
    const manualDeviceId = `manual-override-${Date.now()}`;
    const serverNonce = generateServerNonce();
    const scanned_at_server = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('scans_valid')
      .insert({
        session_id,
        student_index,
        name,
        surname,
        client_lat: session.prof_lat, // Use professor's location
        client_lon: session.prof_lon,
        client_ts: scanned_at_server,
        scanned_at_server,
        distance_m: 0,
        device_id: manualDeviceId,
        server_nonce: serverNonce,
        client_nonce: `manual-override-${serverNonce}`,
        app_version: 'manual-override',
      });

    if (insertError) {
      console.error('Error inserting manual override:', insertError);

      // Check if student already has a valid scan
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A device has already submitted a valid scan for this student in this session' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add manual override' },
        { status: 500 }
      );
    }

    // Mark nonce as used
    await supabaseAdmin
      .from('used_server_nonces')
      .insert({
        server_nonce: serverNonce,
        session_id,
      });

    return NextResponse.json({
      message: 'Manual override added successfully',
      student_index,
      name,
      surname,
    });
  } catch (error) {
    console.error('Manual override error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
