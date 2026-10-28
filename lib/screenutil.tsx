"use client";
import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

/**
 * Port of flutter_screenutil 5.9.3 as configured in lib/main.dart:
 *   designSize = web: <600 -> 390x844 | <1200 -> 768x1024 | else 1920x1080
 *   minTextAdapt + splitScreenMode, fontSizeResolver = width.
 *   .w = n*W/dW ; .h = n*max(H,700)/dH ; .r = n*min(scaleW,scaleH) ; .sp = n*W/dW
 */
export interface Screen {
  width: number; height: number;
  w: (n: number) => number; h: (n: number) => number; r: (n: number) => number; sp: (n: number) => number;
  /** AppTypography.size */
  size: (base: number) => number;
  /** ResponsiveHelper.getResponsiveValue: <600 mobile, <1200 tablet, else desktop */
  rv: <T>(mobile: T, tablet: T, desktop: T) => T;
  isMobile: boolean; isTablet: boolean; isDesktop: boolean; isWebWide: boolean;
}

export function makeScreen(width: number, height: number): Screen {
  const [dw, dh] = width < 600 ? [390, 844] : width < 1200 ? [768, 1024] : [1920, 1080];
  const sw = width / dw, sh = Math.max(height, 700) / dh;
  const sp = (n: number) => n * sw;
  return {
    width, height,
    w: (n) => n * sw, h: (n) => n * sh, r: (n) => n * Math.min(sw, sh), sp,
    size: (base) => Math.min(Math.max(sp(base), base * 0.92), base * 1.2),
    rv: (m, t, d) => (width < 600 ? m : width < 1200 ? t : d),
    // ResponsiveUtils breakpoints: 768 / 1024 / 1200
    isMobile: width < 768, isTablet: width >= 768 && width < 1200, isDesktop: width >= 1200, isWebWide: width >= 1024,
  };
}

const Ctx = createContext<Screen>(makeScreen(1920, 1080));
export const useScreen = () => useContext(Ctx);

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Measures the viewport before first paint; children render only once measured so inline px values never mismatch. */
export function ScreenProvider({ children }: { children: ReactNode }) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  useIso(() => {
    const update = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const screen = useMemo(() => (dim ? makeScreen(dim.w, dim.h) : null), [dim]);
  if (!screen) return null;
  return <Ctx.Provider value={screen}>{children}</Ctx.Provider>;
}
