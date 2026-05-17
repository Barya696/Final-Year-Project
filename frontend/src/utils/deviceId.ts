const DEVICE_TRUST_KEY = "ndjamena_device_trust_id";

/** Stable id per browser profile; sent on login for trusted-device / 2FA logic. */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_TRUST_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random()}`;
      localStorage.setItem(DEVICE_TRUST_KEY, id);
    }
    return id;
  } catch {
    return `session-${Date.now()}`;
  }
}
