import { NextRequest, NextResponse } from 'next/server';
import { getProfessorFromToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // csv or excel

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

    // Fetch all valid scans for this session
    const { data: scans, error: scansError } = await supabaseAdmin
      .from('scans_valid')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at_server', { ascending: true });

    if (scansError) {
      console.error('Error fetching scans:', scansError);
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    // Transform data for export
    const exportData = scans.map((scan, index) => ({
      '#': index + 1,
      'Student Index': scan.student_index,
      'Name': scan.name,
      'Surname': scan.surname,
      'Scanned At': new Date(scan.scanned_at_server).toLocaleString(),
      'Client Time': new Date(scan.client_ts).toLocaleString(),
      'Distance (m)': Math.round(scan.distance_m),
      'Device ID': scan.device_id,
      'App Version': scan.app_version || 'N/A',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },  // #
      { wch: 15 }, // Student Index
      { wch: 15 }, // Name
      { wch: 15 }, // Surname
      { wch: 20 }, // Scanned At
      { wch: 20 }, // Client Time
      { wch: 12 }, // Distance
      { wch: 35 }, // Device ID
      { wch: 12 }, // App Version
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Add session info sheet
    const sessionInfo = [
      { Field: 'Session ID', Value: session.session_id },
      { Field: 'Professor', Value: professor.name },
      { Field: 'Start Time', Value: new Date(session.start_ts).toLocaleString() },
      { Field: 'End Time', Value: session.end_ts ? new Date(session.end_ts).toLocaleString() : 'Active' },
      { Field: 'Total Scans', Value: scans.length },
      { Field: 'Professor Location', Value: `${session.prof_lat}, ${session.prof_lon}` },
    ];
    const sessionWorksheet = XLSX.utils.json_to_sheet(sessionInfo);
    sessionWorksheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, sessionWorksheet, 'Session Info');

    if (format === 'excel') {
      // Export as Excel
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance_${sessionId}_${Date.now()}.xlsx"`,
        },
      });
    } else {
      // Export as CSV (only the attendance sheet)
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance_${sessionId}_${Date.now()}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
