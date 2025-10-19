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
        const constraints: any = {
          video: {
            deviceId: { exact: deviceId },
            // iOS Safari specific: explicitly request facing mode and zoom capability
            facingMode: 'environment',
            // Include advanced constraints for better Safari compatibility
            advanced: [{ zoom: 1.0 }]
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

      // Try multiple approaches for Safari/WebKit compatibility
      let zoomApplied = false;

      // Method 1: Advanced constraints (preferred for most browsers)
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom } as any]
        });
        zoomApplied = true;
        console.log('[SCANNER] Zoom applied via advanced constraints');
      } catch (e1) {
        console.log('[SCANNER] Advanced constraints failed, trying direct constraint');
      }

      // Method 2: Direct constraint (WebKit/Safari fallback)
      if (!zoomApplied) {
        try {
          await videoTrack.applyConstraints({
            zoom: newZoom
          } as any);
          zoomApplied = true;
          console.log('[SCANNER] Zoom applied via direct constraint');
        } catch (e2) {
          console.log('[SCANNER] Direct constraint failed, trying iOS-specific method');
        }
      }

      // Method 3: iOS Safari specific - try with explicit type casting
      if (!zoomApplied) {
        try {
          const constraints: any = {
            zoom: { ideal: newZoom }
          };
          await videoTrack.applyConstraints(constraints);
          zoomApplied = true;
          console.log('[SCANNER] Zoom applied via iOS-specific method');
        } catch (e3) {
          console.error('[SCANNER] All zoom methods failed:', e3);
        }
      }

      if (zoomApplied) {
        setZoomLevel(newZoom);
        console.log('[SCANNER] Zoom successfully set to:', newZoom);
      }
    } catch (err) {
      console.error('[SCANNER] Failed to set zoom:', err);
      // Don't disable zoom UI, just log the error
    }
  };

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateZoomFromPosition = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newZoom = 1 + percent * (maxZoom - 1);

    console.log('[SCANNER] Zoom updated to:', newZoom);
    handleZoomChange(newZoom);
  };

  const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('[SCANNER] Mouse down on custom slider');
    setIsDragging(true);
    updateZoomFromPosition(e.clientX);
  };

  const handleSliderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    console.log('[SCANNER] Touch start on custom slider');
    // Safari/iOS: Don't prevent default on touch start to avoid blocking
    // The touchAction: 'none' CSS property handles scroll prevention
    setIsDragging(true);
    if (e.touches.length > 0) {
      updateZoomFromPosition(e.touches[0].clientX);
    }
  };

  const handleSliderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    console.log('[SCANNER] Touch move on custom slider');
    // Prevent scrolling during drag on Safari/iOS
    if (e.cancelable) {
      e.preventDefault();
    }
    if (e.touches.length > 0) {
      updateZoomFromPosition(e.touches[0].clientX);
    }
  };

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateZoomFromPosition(e.clientX);
  };

  const handleSliderEnd = () => {
    if (isDragging) {
      console.log('[SCANNER] Slider drag ended');
      setIsDragging(false);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => handleSliderEnd();
    const handleGlobalTouchEnd = () => handleSliderEnd();

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          style={{
            maxHeight: '400px',
            minHeight: '300px',
            objectFit: 'cover',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
          } as React.CSSProperties}
          autoPlay
          playsInline
          muted
          webkit-playsinline="true"
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

      {/* Zoom slider control - below the camera */}
      {supportsZoom && isScanning && !error && !hasScanned && (
        <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium whitespace-nowrap">
              {zoomLevel.toFixed(1)}x
            </span>
            <div className="flex-1 py-2">
              {/* Custom draggable slider for Safari compatibility */}
              <div
                ref={sliderRef}
                className="relative h-8 flex items-center cursor-pointer select-none"
                onMouseDown={handleSliderMouseDown}
                onMouseMove={handleSliderMouseMove}
                onTouchStart={handleSliderTouchStart}
                onTouchMove={handleSliderTouchMove}
                role="slider"
                aria-label="Zoom level"
                aria-valuemin={1}
                aria-valuemax={maxZoom}
                aria-valuenow={zoomLevel}
                tabIndex={0}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                } as React.CSSProperties}
              >
                {/* Track */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                  <div
                    className="w-full h-2 bg-gray-600 rounded-full"
                    style={{
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    } as React.CSSProperties}
                  >
                    {/* Filled portion */}
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${((zoomLevel - 1) / (maxZoom - 1)) * 100}%`,
                        WebkitTransition: 'width 0.15s ease-out',
                        transition: 'width 0.15s ease-out',
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
                {/* Thumb */}
                <div
                  className="absolute w-7 h-7 bg-indigo-600 border-3 border-white rounded-full shadow-lg z-10 transform -translate-x-1/2 transition-transform"
                  style={{
                    left: `${((zoomLevel - 1) / (maxZoom - 1)) * 100}%`,
                    transform: `translateX(-50%) ${isDragging ? 'scale(1.1)' : 'scale(1)'}`,
                    WebkitTransform: `translateX(-50%) ${isDragging ? 'scale(1.1)' : 'scale(1)'}`,
                    WebkitTapHighlightColor: 'transparent',
                  } as React.CSSProperties}
                />
              </div>
            </div>
            <span className="text-white text-xs opacity-70 whitespace-nowrap">
              Zoom
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
