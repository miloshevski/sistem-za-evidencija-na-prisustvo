import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

    const sessionId = params.sessionId;

    // Verify session belongs to professor
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.professor_id !== professor.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this session' },
        { status: 403 }
      );
    }

    // Get valid scans
    const { data: validScans, error: validError } = await supabaseAdmin
      .from('scans_valid')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at_server', { ascending: false });

    if (validError) {
      console.error('Error fetching valid scans:', validError);
      return NextResponse.json(
        { error: 'Failed to fetch valid scans' },
        { status: 500 }
      );
    }

    // Get invalid scans
    const { data: invalidScans, error: invalidError } = await supabaseAdmin
      .from('scans_invalid')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at_server', { ascending: false });

    if (invalidError) {
      console.error('Error fetching invalid scans:', invalidError);
      return NextResponse.json(
        { error: 'Failed to fetch invalid scans' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      valid_scans: validScans || [],
      invalid_scans: invalidScans || [],
      valid_count: validScans?.length || 0,
      invalid_count: invalidScans?.length || 0,
    });
  } catch (error) {
    console.error('Get scans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
