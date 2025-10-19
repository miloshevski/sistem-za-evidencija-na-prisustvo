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
  const streamRef = useRef<MediaStream | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);

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

        // Get the stream to check zoom capabilities
        // Safari-compatible approach: request stream with advanced constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            // Include advanced constraints for better Safari compatibility
            advanced: [{ zoom: 1.0 } as any]
          } as any
        });
        streamRef.current = stream;

        // Check if zoom is supported
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities() as any;
        const settings = videoTrack.getSettings() as any;

        // Check for zoom support in multiple ways for Safari compatibility
        let hasZoomSupport = false;
        let zoomMax = 1;

        if (capabilities.zoom) {
          hasZoomSupport = true;
          zoomMax = capabilities.zoom.max || 5;
          console.log('[SCANNER] Zoom supported via capabilities, max:', zoomMax);
        } else if (settings.zoom !== undefined) {
          // Safari might support zoom but not report it in capabilities
          hasZoomSupport = true;
          zoomMax = 5; // Default max for Safari
          console.log('[SCANNER] Zoom detected via settings (Safari)');
        } else {
          console.log('[SCANNER] Zoom not supported on this device');
        }

        if (hasZoomSupport) {
          setSupportsZoom(true);
          setMaxZoom(zoomMax);
        }

        // Assign stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

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
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScanSuccess, onScanError]);

  const handleZoomChange = async (newZoom: number) => {
    if (!streamRef.current || !supportsZoom) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];

      // Try multiple approaches for Safari compatibility
      try {
        // Standard approach (Chrome, Firefox)
        await videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom } as any]
        });
      } catch (e1) {
        try {
          // Safari alternative: direct constraint
          await videoTrack.applyConstraints({
            zoom: newZoom
          } as any);
        } catch (e2) {
          console.error('[SCANNER] Both zoom methods failed:', e1, e2);
          throw e2;
        }
      }

      setZoomLevel(newZoom);
      console.log('[SCANNER] Zoom set to:', newZoom);
    } catch (err) {
      console.error('[SCANNER] Failed to set zoom:', err);
      // Don't disable zoom UI, just log the error
    }
  };

  const zoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.5, maxZoom);
    handleZoomChange(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.5, 1);
    handleZoomChange(newZoom);
  };

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
      {/* Zoom controls */}
      {supportsZoom && isScanning && !error && !hasScanned && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= maxZoom}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded text-center">
            {zoomLevel.toFixed(1)}x
          </div>
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 1}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Zoom out"
          >
            −
          </button>
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
