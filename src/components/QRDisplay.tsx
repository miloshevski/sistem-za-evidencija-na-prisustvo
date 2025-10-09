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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;

    const fetchAndGenerateQR = async () => {
      try {
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
        });

        setQrDataURL(dataURL);
        setTimeLeft(rotationInterval / 1000);
        setError('');
      } catch (err) {
        setError('Failed to generate QR code');
      }
    };

    // Initial fetch
    fetchAndGenerateQR();

    // Set up rotation interval
    intervalId = setInterval(fetchAndGenerateQR, rotationInterval);

    // Set up countdown
    countdownId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return rotationInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(countdownId);
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
            <img src={qrDataURL} alt="Attendance QR Code" className="mx-auto" />
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
            <div className="text-gray-600">Generating QR code...</div>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Students should scan this QR code to mark their attendance
      </p>
    </div>
  );
}
