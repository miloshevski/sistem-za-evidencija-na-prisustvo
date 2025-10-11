'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ViewPastSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [archivedScans, setArchivedScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('professor_token');
    if (!token) {
      router.push('/professor/login');
      return;
    }

    fetchArchivedScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchArchivedScans = async () => {
    const token = localStorage.getItem('professor_token');
    try {
      const response = await fetch(`/api/sessions/${sessionId}/archived-scans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/professor/login');
          return;
        }
        alert('Failed to load session data');
        router.push('/professor/dashboard');
        return;
      }

      const data = await response.json();
      setSession(data.session);
      setArchivedScans(data.archived_scans);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching archived scans:', err);
      alert('Error loading session data');
      router.push('/professor/dashboard');
    }
  };

  const exportScans = async (format: 'csv' | 'excel') => {
    setExporting(true);
    const token = localStorage.getItem('professor_token');

    try {
      const response = await fetch(`/api/sessions/${sessionId}/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        alert('Failed to export scans');
        setExporting(false);
        return;
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${sessionId}_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error exporting scans');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading session...</div>
      </div>
    );
  }

  const duration = session.end_ts
    ? Math.round(
        (new Date(session.end_ts).getTime() - new Date(session.start_ts).getTime()) /
          1000 /
          60
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center mb-2">
                <button
                  onClick={() => router.push('/professor/dashboard')}
                  className="mr-4 text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Past Session</h1>
              </div>
              <div className="ml-10 space-y-1 text-sm text-gray-600">
                <p>Started: {new Date(session.start_ts).toLocaleString()}</p>
                <p>Ended: {session.end_ts ? new Date(session.end_ts).toLocaleString() : 'N/A'}</p>
                <p>Duration: {duration} minutes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportScans('csv')}
                disabled={exporting || archivedScans.length === 0}
                className="px-4 py-2 border border-green-600 text-green-600 rounded-md text-sm font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => exportScans('excel')}
                disabled={exporting || archivedScans.length === 0}
                className="px-4 py-2 border border-green-600 text-green-600 rounded-md text-sm font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {archivedScans.length}
              </div>
              <div className="text-sm text-green-800 mt-1">Total Attendees</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{duration}</div>
              <div className="text-sm text-blue-800 mt-1">Minutes</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Session ID</div>
              <div className="text-xs font-mono text-gray-800 mt-1 break-all">
                {sessionId}
              </div>
            </div>
          </div>
        </div>

        {/* Archived Scans Table */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Attendance Records ({archivedScans.length})
          </h2>
          {archivedScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attendance records found for this session
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Index
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {archivedScans.map((scan, index) => (
                    <tr key={scan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(scan.scanned_at_server).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scan.student_index}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scan.name} {scan.surname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Math.round(scan.distance_m)}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
