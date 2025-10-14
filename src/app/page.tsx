"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentPosition } from "@/lib/gps";
import { getDeviceId } from "@/lib/deviceId";
import { generateClientNonce } from "@/lib/crypto";
import QRScanner from "@/components/QRScanner";

export default function StudentScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "scan" | "result">("form");
  const [studentData, setStudentData] = useState({
    student_index: "",
    name: "",
    surname: "",
  });
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
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

    // Load saved student data from localStorage
    const saved = localStorage.getItem("student_form_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStudentData(parsed);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Save student data to localStorage
    localStorage.setItem("student_form_data", JSON.stringify(studentData));

    // Go directly to scan step
    setStep("scan");
  };

  const handleQRScan = async (qrData: string) => {
    if (scanning) {
      console.log("Already scanning, ignoring duplicate scan");
      return; // Prevent multiple scans
    }

    setScanning(true);
    setLoading(true);
    setError("");

    try {
      console.log("[SCAN] QR code scanned, starting process...");

      // Parse QR code data
      const qrPayload = JSON.parse(qrData);
      const { session_id, token, server_nonce } = qrPayload;

      if (!session_id || !token || !server_nonce) {
        setError("Invalid QR code");
        setLoading(false);
        setScanning(false);
        return;
      }

      console.log("[SCAN] Getting GPS location...");

      // Capture GPS location NOW (when QR is scanned)
      const position = await getCurrentPosition();
      const client_lat = position.coords.latitude;
      const client_lon = position.coords.longitude;

      // Capture timestamp NOW (when QR is scanned)
      const client_ts = new Date().toISOString();
      const client_nonce = generateClientNonce();

      console.log("[SCAN] GPS captured:", { client_lat, client_lon });
      console.log("[SCAN] Timestamp:", client_ts);

      // Submit scan to server
      console.log("[SCAN] Submitting to server...");
      const response = await fetch("/api/scans/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id,
          token,
          server_nonce,
          student_index: studentData.student_index,
          name: studentData.name,
          surname: studentData.surname,
          client_lat,
          client_lon,
          client_ts,
          device_id: deviceId,
          client_nonce,
          app_version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
        }),
      });

      const data = await response.json();
      console.log("[SCAN] Server response:", data);

      // Show result
      setResult(data);
      setStep("result");
      setLoading(false);
      setScanning(false);
    } catch (err: any) {
      console.error("[SCAN] Error:", err);
      setError(err.message || "Failed to submit scan. Please try again.");
      setLoading(false);
      setScanning(false);
    }
  };

  const handleQRError = (errorMsg: string) => {
    console.error("[SCAN] QR Error:", errorMsg);
    setError(errorMsg);
  };

  const reset = () => {
    setStep("form");
    setError("");
    setResult(null);
    setLoading(false);
    setScanning(false);
  };

  const tryAgain = () => {
    setStep("scan");
    setError("");
    setResult(null);
    setLoading(false);
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Class Attendance</h1>
          <p className="mt-2 text-sm text-gray-600">
            Scan QR code to mark your attendance
          </p>
        </div>

        {/* Error display */}
        {error && step !== "result" && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Student Information Form */}
        {step === "form" && (
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 placeholder-gray-700 font-medium focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={studentData.student_index}
                  onChange={(e) =>
                    setStudentData({
                      ...studentData,
                      student_index: e.target.value,
                    })
                  }
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 placeholder-gray-700 font-medium focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 placeholder-gray-700 font-medium focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                Continue to Scan QR Code
              </button>
            </form>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> When you scan the QR code, your GPS
                location will be captured automatically.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: QR Scanner */}
        {step === "scan" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Scan QR Code
            </h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Scanning as:</strong> {studentData.name}{" "}
                {studentData.surname} ({studentData.student_index})
              </p>
            </div>
            <div className="mb-4">
              {!loading && !scanning && (
                <QRScanner
                  onScanSuccess={handleQRScan}
                  onScanError={handleQRError}
                />
              )}
            </div>
            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">
                  {scanning ? "Processing scan..." : "Getting location..."}
                </p>
              </div>
            )}
            <button
              onClick={reset}
              className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Change Student Info
            </button>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
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
                  {result.message ||
                    "Your attendance has been successfully recorded."}
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
                  {result.reason || "Unable to record attendance."}
                </p>
                <div className="mt-6 space-y-2">
                  <button
                    onClick={tryAgain}
                    className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={reset}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Change Student Info
                  </button>
                </div>
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
            onClick={() => router.push("/professor/login")}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Professor? Click here to login
          </button>
        </div>
      </div>
    </div>
  );
}
