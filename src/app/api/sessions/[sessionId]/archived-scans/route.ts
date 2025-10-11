import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
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

    const { sessionId } = await params;

    // Verify session belongs to professor
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session || session.professor_id !== professor.id) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch archived scans for this session
    const { data: archivedScans, error: scansError } = await supabaseAdmin
      .from('archived_scans')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at_server', { ascending: true });

    if (scansError) {
      console.error('Error fetching archived scans:', scansError);
      return NextResponse.json(
        { error: 'Failed to fetch archived scans' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      archived_scans: archivedScans || [],
    });
  } catch (error) {
    console.error('Fetch archived scans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
