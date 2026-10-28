// Mirrors Flutter's shared_preferences_web: keys are stored in localStorage as "flutter.<key>"
// with JSON-encoded values. If this app is later served from the same origin as the Flutter
// build, existing sessions/cart/language carry over unchanged.
const PREFIX = "flutter.";

function ls(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export const prefs = {
  getString(key: string): string | null {
    const v = this._raw(key); return typeof v === "string" ? v : null;
  },
  getInt(key: string): number | null {
    const v = this._raw(key); return typeof v === "number" ? Math.trunc(v) : null;
  },
  getDouble(key: string): number | null {
    const v = this._raw(key); return typeof v === "number" ? v : null;
  },
  getBool(key: string): boolean | null {
    const v = this._raw(key); return typeof v === "boolean" ? v : null;
  },
  _raw(key: string): unknown {
    try {
      const s = ls()?.getItem(PREFIX + key);
      return s == null ? null : JSON.parse(s);
    } catch { return null; }
  },
  set(key: string, value: string | number | boolean) {
    try { ls()?.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* quota/private mode */ }
  },
  remove(key: string) {
    try { ls()?.removeItem(PREFIX + key); } catch { /* ignore */ }
  },
};
