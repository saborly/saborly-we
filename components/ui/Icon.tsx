import type { CSSProperties } from "react";
import icons from "@/lib/materialIcons.json";
import rtlIcons from "@/lib/materialIconsRtl.json";

const MAP = icons as Record<string, number>;
const MIRROR = new Set(rtlIcons as string[]);

/** Flutter `Icon(Icons.<name>)` — same MaterialIcons font + codepoints as the Flutter SDK.
 *  Icons declared with matchTextDirection (arrows, etc.) mirror under dir=rtl via the `.mirror-rtl` rule. */
// Glyphs that failed to render from the icon font in some browsers: drawn as inline SVG (same Material shapes)
const FB = "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z";
const MAIL = "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-.4 4.25l-7.07 4.42c-.32.2-.74.2-1.06 0L4.4 8.25c-.25-.16-.4-.43-.4-.72 0-.67.73-1.07 1.3-.72L12 11l6.7-4.19c.57-.35 1.3.05 1.3.72 0 .29-.15.56-.4.72z";
const BACK = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z";
const BACK_ROUNDED = "M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z";
const BACK_IOS = "M17.51 3.87L15.73 2.1 5.84 12l9.9 9.9 1.77-1.77L9.38 12l8.13-8.13z";
const SVG_ICONS: Record<string, string> = { facebook: FB, facebook_rounded: FB, email_rounded: MAIL, arrow_back: BACK, arrow_back_rounded: BACK_ROUNDED, arrow_back_ios: BACK_IOS };

export function Icon({ name, size = 24, color, style }: { name: string; size?: number; color?: string; style?: CSSProperties }) {
  const cp = MAP[name];
  const svg = SVG_ICONS[name];
  if (svg) {
    return (
      <svg aria-hidden className={MIRROR.has(name) ? "mirror-rtl" : undefined} width={size} height={size} viewBox="0 0 24 24" fill={color ?? "currentColor"} style={{ display: "inline-block", flex: "none", ...style }}><path d={svg} /></svg>
    );
  }
  return (
    <span
      aria-hidden
      className={MIRROR.has(name) ? "material-icon mirror-rtl" : "material-icon"}
      style={{ fontSize: size, width: size, height: size, lineHeight: 1, color, ...style }}
    >
      {cp ? String.fromCodePoint(cp) : ""}
    </span>
  );
}
