'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

interface QRDisplayProps {
  sessionId: string;
  rotationInterval?: number; // in milliseconds
}

export default function QRDisplay({ sessionId, rotationInterval = 5000 }: QRDisplayProps) {
  const [qrDataURL, setQrDataURL] = useState('');
  const [timeLeft, setTimeLeft] = useState(Math.floor(rotationInterval / 1000));
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isMountedRef.current = true;
    let currentTime = Math.floor(rotationInterval / 1000);

    const fetchAndGenerateQR = async () => {
      if (!isMountedRef.current) return;

      try {
        console.log('[QR] Fetching new token...');
        const response = await fetch(`/api/sessions/${sessionId}/qr-token`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to generate QR code');
          return;
        }

        // Generate QR code
        const qrData = data.qr_data;
        const dataURL = await QRCode.toDataURL(qrData, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });

        if (isMountedRef.current) {
          console.log('[QR] QR code generated successfully');
          setQrDataURL(dataURL);
          setError('');

          // Reset countdown to full interval
          currentTime = Math.floor(rotationInterval / 1000);
          setTimeLeft(currentTime);
        }
      } catch (err) {
        console.error('[QR] Error generating QR:', err);
        if (isMountedRef.current) {
          setError('Failed to generate QR code');
        }
      }
    };

    // Initial fetch
    fetchAndGenerateQR();

    // Start countdown that also triggers QR refresh
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;

      currentTime--;

      if (currentTime <= 0) {
        // Time's up - fetch new QR code
        console.log('[QR] Countdown reached 0, fetching new QR...');
        fetchAndGenerateQR();
      } else {
        // Update countdown display
        setTimeLeft(currentTime);
      }
    }, 1000); // Update every second

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, rotationInterval]);

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="bg-white p-8 rounded-lg shadow-lg inline-block">
        {qrDataURL ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataURL}
              alt="Attendance QR Code"
              className="mx-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="mt-4">
              <div className="text-lg font-semibold text-gray-700">
                Refreshes in{' '}
                <span className="text-2xl font-bold text-indigo-600">{timeLeft}s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-96 h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="ml-4 text-gray-600">Generating QR code...</p>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Students should scan this QR code to mark their attendance
      </p>
    </div>
  );
}
