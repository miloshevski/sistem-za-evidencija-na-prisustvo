import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidGPS } from '@/lib/gps';

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

    const { prof_lat, prof_lon } = await request.json();

    if (!isValidGPS(prof_lat, prof_lon)) {
      return NextResponse.json(
        { error: 'Invalid GPS coordinates' },
        { status: 400 }
      );
    }

    // Check if professor already has an active session
    const { data: existingSessions } = await supabaseAdmin
      .from('sessions')
      .select('session_id')
      .eq('professor_id', professor.id)
      .eq('is_active', true);

    if (existingSessions && existingSessions.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active session. Please end it before starting a new one.' },
        { status: 400 }
      );
    }

    // Create new session
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        professor_id: professor.id,
        prof_lat,
        prof_lon,
        start_ts: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_id: session.session_id,
      prof_lat: session.prof_lat,
      prof_lon: session.prof_lon,
      start_ts: session.start_ts,
    });
  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
