'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPosition } from '@/lib/gps';

interface Session {
  session_id: string;
  professor_id: string;
  start_ts: string;
  end_ts: string | null;
  prof_lat: number;
  prof_lon: number;
  is_active: boolean;
  valid_scans_count: number;
  invalid_scans_count: number;
  archived_scans_count: number;
}

export default function ProfessorDashboard() {
  const router = useRouter();
  const [professor, setProfessor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    verifyAuth();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAuth = async () => {
    const token = localStorage.getItem('professor_token');
    if (!token) {
      router.push('/professor/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        localStorage.removeItem('professor_token');
        localStorage.removeItem('professor');
        router.push('/professor/login');
        return;
      }

      const data = await response.json();
      setProfessor(data.professor);
      setLoading(false);
    } catch (err) {
      router.push('/professor/login');
    }
  };

  const fetchSessions = async () => {
    const token = localStorage.getItem('professor_token');
    if (!token) return;

    try {
      const response = await fetch('/api/sessions/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const viewSession = (sessionId: string, isActive: boolean) => {
    if (isActive) {
      router.push(`/professor/session/${sessionId}`);
    } else {
      router.push(`/professor/session/${sessionId}/view`);
    }
  };

  const endSessionFromDashboard = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) {
      return;
    }

    const token = localStorage.getItem('professor_token');
    try {
      const response = await fetch('/api/sessions/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        fetchSessions(); // Refresh the list
      } else {
        alert('Failed to end session');
      }
    } catch (err) {
      alert('Error ending session');
    }
  };

  const startSession = async () => {
    setError('');
    setStartingSession(true);

    try {
      // Get professor's GPS location
      const position = await getCurrentPosition();
      const prof_lat = position.coords.latitude;
      const prof_lon = position.coords.longitude;

      const token = localStorage.getItem('professor_token');
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prof_lat, prof_lon }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start session');
        setStartingSession(false);
        return;
      }

      // Store session info and redirect to session page
      localStorage.setItem('active_session', JSON.stringify(data));
      router.push(`/professor/session/${data.session_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to get your location. Please enable GPS and try again.');
      setStartingSession(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('professor_token');
    localStorage.removeItem('professor');
    router.push('/professor/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.is_active);
  const pastSessions = sessions.filter((s) => !s.is_active);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {professor?.name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{professor?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Start Session Card */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Start Attendance Session
            </h2>
            <p className="text-gray-600 mb-6">
              Click the button below to start a new attendance session. Your GPS location will be captured.
            </p>
            <button
              onClick={startSession}
              disabled={startingSession || activeSessions.length > 0}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingSession ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Starting Session...
                </>
              ) : (
                'Start New Session'
              )}
            </button>
            {activeSessions.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                You already have an active session. Please end it before starting a new one.
              </p>
            )}
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Active Sessions
            </h2>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          Started: {new Date(session.start_ts).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-green-700 font-medium">
                          {session.valid_scans_count} valid scans
                        </span>
                        <span className="text-red-600">
                          {session.invalid_scans_count} invalid scans
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewSession(session.session_id, true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        View Session
                      </button>
                      <button
                        onClick={() => endSessionFromDashboard(session.session_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        End Session
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Past Sessions
          </h2>
          {loadingSessions ? (
            <div className="text-center py-8 text-gray-500">Loading sessions...</div>
          ) : pastSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No past sessions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Scans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invalid Scans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastSessions.map((session) => {
                    const duration = session.end_ts
                      ? Math.round(
                          (new Date(session.end_ts).getTime() -
                            new Date(session.start_ts).getTime()) /
                            1000 /
                            60
                        )
                      : 0;
                    return (
                      <tr key={session.session_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(session.start_ts).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-500">
                            {new Date(session.start_ts).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {duration} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {session.archived_scans_count > 0
                            ? session.archived_scans_count
                            : session.valid_scans_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {session.invalid_scans_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewSession(session.session_id, false)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click &quot;Start New Session&quot; to begin</li>
            <li>A QR code will be generated that rotates every 5 seconds</li>
            <li>Students scan the QR code to mark their attendance</li>
            <li>Only students within 50m of your location can successfully scan</li>
            <li>View all scans in real-time on the session page</li>
            <li>You can manually override attendance if needed</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
