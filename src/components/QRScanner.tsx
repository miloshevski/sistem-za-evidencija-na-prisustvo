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
  const [hasScanned, setHasScanned] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanning = async () => {
      if (!videoRef.current || !readerRef.current || !mounted) return;

      try {
        setIsScanning(true);
        setError('');

        console.log('[SCANNER] Requesting camera access...');
        const videoInputDevices = await readerRef.current.listVideoInputDevices();

        if (videoInputDevices.length === 0) {
          setError('No camera found');
          onScanError('No camera found');
          setIsScanning(false);
          return;
        }

        console.log('[SCANNER] Found', videoInputDevices.length, 'camera(s)');

        // Use back camera if available (for mobile)
        const backCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
        );
        const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

        console.log('[SCANNER] Using camera:', backCamera?.label || videoInputDevices[0].label);

        // Add delay to ensure video element is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted || !videoRef.current) return;

        readerRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            if (result && !hasScanned && mounted) {
              console.log('[SCANNER] QR code detected!');
              setHasScanned(true);
              onScanSuccess(result.getText());
              // Stop scanning after successful scan
              if (readerRef.current) {
                readerRef.current.reset();
              }
            }
            // Ignore "NotFoundException" - it just means no QR code found yet
            if (err && err.name !== 'NotFoundException') {
              console.error('[SCANNER] Decode error:', err);
            }
          }
        );

        console.log('[SCANNER] Scanner started successfully');
      } catch (err: any) {
        console.error('[SCANNER] Camera error:', err);
        if (mounted) {
          setError('Failed to access camera. Please allow camera permissions.');
          onScanError('Failed to access camera');
          setIsScanning(false);
        }
      }
    };

    // Start scanning with a small delay to ensure video element is rendered
    const timeoutId = setTimeout(() => {
      startScanning();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (e) {
          // Ignore reset errors
        }
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full rounded-lg"
        style={{
          maxHeight: '400px',
          minHeight: '300px',
          objectFit: 'cover',
        }}
        autoPlay
        playsInline
        muted
      />
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm z-10">
          {error}
        </div>
      )}
      {isScanning && !error && !hasScanned && (
        <div className="absolute bottom-4 left-0 right-0 text-center z-10">
          <div className="inline-block bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
            📷 Point camera at QR code
          </div>
        </div>
      )}
      {hasScanned && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center z-10">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-semibold">
            ✓ QR Code Detected!
          </div>
        </div>
      )}
      {/* Scanning frame overlay */}
      {!error && (
        <div className="absolute inset-0 pointer-events-none z-5">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-indigo-500 rounded-lg">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}
