'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

interface QRDisplayProps {
  sessionId: string;
  rotationInterval?: number; // in milliseconds
}

export default function QRDisplay({ sessionId, rotationInterval = 5000 }: QRDisplayProps) {
  const [qrDataURL, setQrDataURL] = useState('');
  const [timeLeft, setTimeLeft] = useState(rotationInterval / 1000);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchAndGenerateQR = async () => {
      if (!isMountedRef.current || isGenerating) return;

      setIsGenerating(true);

      try {
        console.log('[QR] Fetching new token...');
        const response = await fetch(`/api/sessions/${sessionId}/qr-token`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to generate QR code');
          setIsGenerating(false);
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
          console.log('[QR] QR code generated, resetting countdown');
          setQrDataURL(dataURL);
          setTimeLeft(rotationInterval / 1000);
          setError('');
          setIsGenerating(false);

          // Schedule next fetch
          fetchTimeoutRef.current = setTimeout(() => {
            fetchAndGenerateQR();
          }, rotationInterval);
        }
      } catch (err) {
        console.error('[QR] Error generating QR:', err);
        if (isMountedRef.current) {
          setError('Failed to generate QR code');
          setIsGenerating(false);
        }
      }
    };

    // Start countdown timer (updates every second)
    const startCountdown = () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            return rotationInterval / 1000;
          }
          return newTime;
        });
      }, 1000);
    };

    // Initial fetch and start countdown
    fetchAndGenerateQR();
    startCountdown();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
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
            <img
              src={qrDataURL}
              alt="Attendance QR Code"
              className="mx-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                QR code refreshes in{' '}
                <span className="font-semibold text-indigo-600">{timeLeft}s</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / (rotationInterval / 1000)) * 100}%`,
                  }}
                ></div>
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
