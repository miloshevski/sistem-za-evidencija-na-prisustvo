'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPosition } from '@/lib/gps';

export default function ProfessorDashboard() {
  const router = useRouter();
  const [professor, setProfessor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyAuth();
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
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
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Start Attendance Session
            </h2>
            <p className="text-gray-600 mb-6">
              Click the button below to start a new attendance session. Your GPS location will be captured.
            </p>
            <button
              onClick={startSession}
              disabled={startingSession}
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
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Start New Session" to begin</li>
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
