import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Fetch all sessions for this professor (both active and ended)
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('professor_id', professor.id)
      .order('start_ts', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // For each session, get the count of valid and invalid scans
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        // Count valid scans
        const { count: validCount } = await supabaseAdmin
          .from('scans_valid')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.session_id);

        // Count invalid scans
        const { count: invalidCount } = await supabaseAdmin
          .from('scans_invalid')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.session_id);

        // Count archived scans if session is ended
        let archivedCount = 0;
        if (!session.is_active) {
          const { count } = await supabaseAdmin
            .from('archived_scans')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.session_id);
          archivedCount = count || 0;
        }

        return {
          ...session,
          valid_scans_count: validCount || 0,
          invalid_scans_count: invalidCount || 0,
          archived_scans_count: archivedCount,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithCounts,
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
