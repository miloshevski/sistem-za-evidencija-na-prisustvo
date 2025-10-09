import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'attendance_device_id';

// Get or create persistent device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return ''; // Server-side, return empty
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

// Clear device ID (for testing purposes)
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}
