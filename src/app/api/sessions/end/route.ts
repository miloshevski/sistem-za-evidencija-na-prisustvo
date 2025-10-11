import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to professor
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('professor_id')
      .eq('session_id', session_id)
      .single();

    if (!session || session.professor_id !== professor.id) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch all valid scans for this session to archive them
    const { data: validScans, error: scansError } = await supabaseAdmin
      .from('scans_valid')
      .select('*')
      .eq('session_id', session_id);

    if (scansError) {
      console.error('Error fetching valid scans for archiving:', scansError);
      // Continue anyway, don't fail the session end
    }

    // Archive the valid scans
    if (validScans && validScans.length > 0) {
      const archivedScans = validScans.map((scan) => ({
        session_id: scan.session_id,
        student_index: scan.student_index,
        name: scan.name,
        surname: scan.surname,
        client_lat: scan.client_lat,
        client_lon: scan.client_lon,
        client_ts: scan.client_ts,
        scanned_at_server: scan.scanned_at_server,
        distance_m: scan.distance_m,
        device_id: scan.device_id,
        server_nonce: scan.server_nonce,
        client_nonce: scan.client_nonce,
        app_version: scan.app_version,
        archived_at: new Date().toISOString(),
      }));

      const { error: archiveError } = await supabaseAdmin
        .from('archived_scans')
        .insert(archivedScans);

      if (archiveError) {
        console.error('Error archiving scans:', archiveError);
        // Continue anyway, don't fail the session end
      }
    }

    // End the session
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        end_ts: new Date().toISOString(),
        is_active: false,
      })
      .eq('session_id', session_id);

    if (updateError) {
      console.error('Error ending session:', updateError);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }

    // Delete QR tokens for this session
    await supabaseAdmin
      .from('qr_tokens')
      .delete()
      .eq('session_id', session_id);

    return NextResponse.json({
      message: 'Session ended successfully',
      session_id,
      archived_count: validScans?.length || 0,
    });
  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
