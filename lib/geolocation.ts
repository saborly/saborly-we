// Port of lib/core/services/geolocation_service_web.dart
function requestPosition(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 3600_000 },
    );
  });
}
async function permissionState(): Promise<string | null> {
  try {
    if (!navigator.permissions) return null;
    return (await navigator.permissions.query({ name: "geolocation" as PermissionName })).state;
  } catch { return null; }
}
async function awaitPermissionSettled(timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await permissionState();
    if (s == null) return null;
    if (s !== "prompt") return s;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}
/** detectUserLocation(): first try 8s, then wait (≤20s) for the permission to settle, retry once with 6s */
export async function detectUserLocation() {
  const first = await requestPosition(8000);
  if (first) return first;
  if ((await awaitPermissionSettled(20000)) !== "granted") return null;
  return requestPosition(6000);
}
