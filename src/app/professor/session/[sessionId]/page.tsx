'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QRDisplay from '@/components/QRDisplay';

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [professor, setProfessor] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [validScans, setValidScans] = useState<any[]>([]);
  const [invalidScans, setInvalidScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [manualOverrideData, setManualOverrideData] = useState({
    student_index: '',
    name: '',
    surname: '',
    reason: '',
  });
  const [manualOverrideError, setManualOverrideError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('professor_token');
    if (!token) {
      router.push('/professor/login');
      return;
    }

    const prof = JSON.parse(localStorage.getItem('professor') || '{}');
    setProfessor(prof);

    fetchSessionData();

    // Poll for new scans every 3 seconds
    const interval = setInterval(fetchSessionData, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchSessionData = async () => {
    const token = localStorage.getItem('professor_token');
    try {
      const response = await fetch(`/api/sessions/${sessionId}/scans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/professor/login');
          return;
        }
        return;
      }

      const data = await response.json();
      setSession(data.session);
      setValidScans(data.valid_scans);
      setInvalidScans(data.invalid_scans);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching session data:', err);
    }
  };

  const endSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) {
      return;
    }

    setEnding(true);
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
        localStorage.removeItem('active_session');
        router.push('/professor/dashboard');
      } else {
        alert('Failed to end session');
        setEnding(false);
      }
    } catch (err) {
      alert('Error ending session');
      setEnding(false);
    }
  };

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualOverrideError('');

    const token = localStorage.getItem('professor_token');

    try {
      const response = await fetch('/api/scans/manual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          ...manualOverrideData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setManualOverrideError(data.error || 'Failed to add manual override');
        return;
      }

      // Reset form and close modal
      setManualOverrideData({
        student_index: '',
        name: '',
        surname: '',
        reason: '',
      });
      setShowManualOverride(false);
      fetchSessionData(); // Refresh data
    } catch (err) {
      setManualOverrideError('Error adding manual override');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Active Session
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Started: {new Date(session.start_ts).toLocaleString()}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowManualOverride(true)}
                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50"
              >
                Manual Override
              </button>
              <button
                onClick={endSession}
                disabled={ending}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              QR Code for Students
            </h2>
            <QRDisplay sessionId={sessionId} rotationInterval={5000} />
          </div>

          {/* Statistics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Session Statistics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {validScans.length}
                </div>
                <div className="text-sm text-green-800 mt-1">Valid Scans</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {invalidScans.length}
                </div>
                <div className="text-sm text-red-800 mt-1">Invalid Scans</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Session ID</div>
              <div className="text-xs font-mono text-gray-800 mt-1 break-all">
                {sessionId}
              </div>
            </div>
          </div>
        </div>

        {/* Valid Scans Table */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Valid Scans ({validScans.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Index
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
                {validScans.map((scan) => (
                  <tr key={scan.id}>
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
            {validScans.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No valid scans yet
              </div>
            )}
          </div>
        </div>

        {/* Invalid Scans Table */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Invalid Scans ({invalidScans.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Index
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invalidScans.map((scan) => (
                  <tr key={scan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(scan.scanned_at_server).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {scan.student_index || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {scan.name && scan.surname
                        ? `${scan.name} ${scan.surname}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {scan.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invalidScans.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No invalid scans yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      {showManualOverride && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Attendance Override
            </h3>
            {manualOverrideError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                {manualOverrideError}
              </div>
            )}
            <form onSubmit={handleManualOverride}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Student Index
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={manualOverrideData.student_index}
                    onChange={(e) =>
                      setManualOverrideData({
                        ...manualOverrideData,
                        student_index: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={manualOverrideData.name}
                    onChange={(e) =>
                      setManualOverrideData({
                        ...manualOverrideData,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={manualOverrideData.surname}
                    onChange={(e) =>
                      setManualOverrideData({
                        ...manualOverrideData,
                        surname: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason (optional)
                  </label>
                  <textarea
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    value={manualOverrideData.reason}
                    onChange={(e) =>
                      setManualOverrideData({
                        ...manualOverrideData,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualOverride(false);
                    setManualOverrideError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Add Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
