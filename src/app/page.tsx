'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPosition } from '@/lib/gps';
import { getDeviceId } from '@/lib/deviceId';
import { generateClientNonce } from '@/lib/crypto';
import QRScanner from '@/components/QRScanner';

export default function StudentScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'gps' | 'scan' | 'result'>('form');
  const [studentData, setStudentData] = useState({
    student_index: '',
    name: '',
    surname: '',
  });
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lon: number;
    timestamp: string;
  } | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [clientNonce, setClientNonce] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    message?: string;
    reason?: string;
    distance_m?: number;
  } | null>(null);

  useEffect(() => {
    // Get device ID on mount
    const id = getDeviceId();
    setDeviceId(id);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('gps');

    try {
      // Capture GPS location
      const position = await getCurrentPosition();
      const gps = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      setGpsData(gps);
      setClientNonce(generateClientNonce());

      // Move to scanning step
      setStep('scan');
      setLoading(false);
    } catch (err: any) {
      setError(
        'Failed to get your GPS location. Please enable location services and try again.'
      );
      setStep('form');
      setLoading(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    if (loading) return; // Prevent multiple scans

    setLoading(true);
    setError('');

    try {
      // Parse QR code data
      const qrPayload = JSON.parse(qrData);
      const { session_id, token, server_nonce } = qrPayload;

      if (!session_id || !token || !server_nonce) {
        setError('Invalid QR code');
        setLoading(false);
        return;
      }

      if (!gpsData) {
        setError('GPS data not available. Please try again.');
        setStep('form');
        setLoading(false);
        return;
      }

      // Submit scan to server
      const response = await fetch('/api/scans/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id,
          token,
          server_nonce,
          student_index: studentData.student_index,
          name: studentData.name,
          surname: studentData.surname,
          client_lat: gpsData.lat,
          client_lon: gpsData.lon,
          client_ts: gpsData.timestamp,
          device_id: deviceId,
          client_nonce: clientNonce,
          app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        }),
      });

      const data = await response.json();

      // Show result
      setResult(data);
      setStep('result');
      setLoading(false);

      // Clear local data after submission
      if (data.valid) {
        // Keep device ID but clear other data
        setStudentData({ student_index: '', name: '', surname: '' });
        setGpsData(null);
        setClientNonce('');
      }
    } catch (err: any) {
      setError('Failed to submit scan. Please try again.');
      setStep('scan');
      setLoading(false);
    }
  };

  const handleQRError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const reset = () => {
    setStep('form');
    setStudentData({ student_index: '', name: '', surname: '' });
    setGpsData(null);
    setClientNonce('');
    setError('');
    setResult(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Class Attendance
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Scan QR code to mark your attendance
          </p>
        </div>

        {/* Error display */}
        {error && step !== 'result' && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Student Information Form */}
        {step === 'form' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Enter Your Information
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student Index
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={studentData.student_index}
                  onChange={(e) =>
                    setStudentData({
                      ...studentData,
                      student_index: e.target.value,
                    })
                  }
                  placeholder="e.g., 2021/0001"
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
                  value={studentData.name}
                  onChange={(e) =>
                    setStudentData({ ...studentData, name: e.target.value })
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
                  value={studentData.surname}
                  onChange={(e) =>
                    setStudentData({ ...studentData, surname: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Getting GPS...' : 'Continue to QR Scan'}
              </button>
            </form>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This app will request your GPS location
                to verify you are in the classroom.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: GPS Capture (loading state) */}
        {step === 'gps' && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Capturing your GPS location...</p>
          </div>
        )}

        {/* Step 3: QR Scanner */}
        {step === 'scan' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Scan QR Code
            </h2>
            <div className="mb-4">
              <QRScanner
                onScanSuccess={handleQRScan}
                onScanError={handleQRError}
              />
            </div>
            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Submitting...</p>
              </div>
            )}
            <button
              onClick={reset}
              className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && result && (
          <div className="bg-white shadow rounded-lg p-6">
            {result.valid ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <svg
                    className="h-10 w-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Attendance Recorded!
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {result.message || 'Your attendance has been successfully recorded.'}
                </p>
                {result.distance_m !== undefined && (
                  <p className="mt-1 text-xs text-gray-500">
                    Distance from professor: {result.distance_m}m
                  </p>
                )}
                <button
                  onClick={reset}
                  className="mt-6 w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                  <svg
                    className="h-10 w-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Scan Failed
                </h3>
                <p className="mt-2 text-sm text-red-600">
                  {result.reason || 'Unable to record attendance.'}
                </p>
                <button
                  onClick={reset}
                  className="mt-6 w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Device ID Display (for debugging) */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Device ID: {deviceId.substring(0, 8)}...
          </p>
        </div>

        {/* Professor Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/professor/login')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Professor? Click here to login
          </button>
        </div>
      </div>
    </div>
  );
}
