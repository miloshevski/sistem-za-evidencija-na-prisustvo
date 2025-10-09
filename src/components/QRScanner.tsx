'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface QRScannerProps {
  onScanSuccess: (data: string) => void;
  onScanError: (error: string) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    startScanning();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current || !readerRef.current) return;

    try {
      setIsScanning(true);
      setError('');

      const videoInputDevices = await readerRef.current.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        setError('No camera found');
        onScanError('No camera found');
        return;
      }

      // Use back camera if available
      const backCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear')
      );
      const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            onScanSuccess(result.getText());
          }
          if (err && err.name !== 'NotFoundException') {
            console.error('QR scan error:', err);
          }
        }
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Failed to access camera');
      onScanError('Failed to access camera');
      setIsScanning(false);
    }
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full rounded-lg"
        style={{ maxHeight: '400px' }}
      />
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {isScanning && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <div className="inline-block bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
            Point camera at QR code
          </div>
        </div>
      )}
      {/* Scanning overlay */}
      <div className="absolute inset-0 border-4 border-indigo-500 rounded-lg pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-indigo-400"></div>
      </div>
    </div>
  );
}
