"use client";
/**
 * Flutter picks ThemeData.visualDensity from defaultTargetPlatform: desktop platforms (windows/macOS/linux)
 * get VisualDensity.compact (-2,-2), android/iOS/fuchsia get standard. On web, defaultTargetPlatform is derived from
 * the user agent. ButtonStyleButton then does:
 *   dy = baseSizeAdjustment.dy (= -8 compact)        -> vertical padding += dy (clamped at 0), min height += dy
 *   dx = max(0, baseSizeAdjustment.dx)               -> horizontal padding never shrinks
 *   minimumSize also gets (dx, dy) via effectiveConstraints (compact: 64x40 -> 56x32)
 */
export function isCompactDensity(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform || "";
  if (/Android/i.test(ua)) return false;
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
  // iPadOS reports as MacIntel with touch points
  if (/Mac/i.test(platform) && (navigator.maxTouchPoints ?? 0) > 2) return false;
  if (/CrOS/i.test(ua)) return true; // flutter: linux
  if (/Win|Mac|Linux|X11/i.test(ua + platform)) return true;
  return false; // fuchsia / unknown -> standard
}
export const densityDy = () => (isCompactDensity() ? -8 : 0);
