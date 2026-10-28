"use client";
import { CSSProperties, ReactNode } from "react";
import { C, withOpacity } from "@/lib/colors";
import { densityDy } from "@/lib/density";
import { useScreen } from "@/lib/screenutil";

type Variant = "elevated" | "outlined" | "text";

/**
 * Material 3 ElevatedButton / OutlinedButton / TextButton as configured by the Flutter app theme (lib/main.dart)
 * and overridden per call site with ButtonStyle (padding / shape / colors). Density-aware (see lib/density.ts).
 *
 * `padding` is [vertical, horizontal] in logical px *before* density; pass `undefined` for the Material default.
 */
export function MButton({
  variant = "elevated", onClick, disabled, padding, radius, bg, fg, border, minWidth, minHeight, fontSize, fontWeight, fontFamily, letterSpacing,
  children, style, fullWidth, elevation, ariaLabel, type,
}: {
  variant?: Variant; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; padding?: [number, number]; radius?: number | string; bg?: string; fg?: string;
  border?: string; minWidth?: number; minHeight?: number; fontSize?: number; fontWeight?: number; fontFamily?: string; letterSpacing?: number;
  children: ReactNode; style?: CSSProperties; fullWidth?: boolean; elevation?: number; ariaLabel?: string; type?: "button" | "submit";
}) {
  const u = useScreen();
  const dy = densityDy();
  // theme defaults from lib/main.dart _buildThemeData(); text/outlined fall back to M3 defaults
  const def = {
    elevated: { pad: [u.h(16), u.w(20)] as [number, number], radius: u.r(20), bg: C.primary, fg: "#FFFFFF", fs: u.sp(16), fw: 800 },
    outlined: { pad: [0, 24] as [number, number], radius: u.r(20), bg: "transparent", fg: C.primaryDark, fs: u.sp(15), fw: 700 },
    text: { pad: [8, 12] as [number, number], radius: 999, bg: "transparent", fg: C.primary, fs: 14, fw: 500 },
  }[variant];
  const [pv, ph] = padding ?? def.pad;
  const padV = Math.max(0, pv + dy);
  const mh = (minHeight ?? 40) + dy, mw = (minWidth ?? 64) + Math.min(0, dy);
  const colorBg = disabled ? (variant === "elevated" ? "rgba(0,0,0,.12)" : "transparent") : bg ?? def.bg;
  const colorFg = disabled ? "rgba(0,0,0,.38)" : fg ?? def.fg;
  const shadow = elevation && !disabled ? `0 ${elevation}px ${elevation * 2.5}px rgba(26,8,3,.22)` : "none";
  return (
    <button type={type ?? "button"} aria-label={ariaLabel} disabled={disabled} onClick={onClick} className="mbtn" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", width: fullWidth ? "100%" : undefined, minWidth: mw, minHeight: mh,
      padding: `${padV}px ${ph}px`, background: colorBg, color: colorFg, borderRadius: radius ?? def.radius, cursor: disabled ? "default" : "pointer",
      border: variant === "outlined" ? border ?? `1.5px solid ${C.border}` : "none", boxShadow: shadow, fontSize: fontSize ?? def.fs, fontWeight: fontWeight ?? def.fw,
      fontFamily: fontFamily ?? "inherit", letterSpacing, lineHeight: 1.366, whiteSpace: "nowrap", ...style,
    }}>{children}</button>
  );
}
void withOpacity;
