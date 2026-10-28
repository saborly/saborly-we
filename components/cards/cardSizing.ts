// Port of lib/shared/widgets/food_item_card/widgets/card_sizing.dart. `u` = ScreenUtil (w/h/r/sp) for current viewport.
import type { Screen } from "@/lib/screenutil";
import { clamp } from "@/components/ui/primitives";

export type CardSize = "extraSmall" | "small" | "medium" | "large";
export const useCompactFooter = (c: CardSize) => c === "extraSmall" || c === "small";
const rv = (screenWidth: number, mobile: number, tablet: number, desktop: number) =>
  screenWidth >= 1200 ? desktop : screenWidth >= 600 ? tablet : mobile;

type Pick4<T> = Record<CardSize, T>;
function byCard(c: CardSize, v: Pick4<number>) { return v[c]; }

export function cardSizeFor(width: number, height: number): CardSize {
  if (width < 140 || height < 180) return "extraSmall";
  if (width < 180 || height < 220) return "small";
  if (width < 220 || height < 280) return "medium";
  return "large";
}

export function makeSizing(u: Screen, screenWidth: number) {
  const R = (m: number, t: number, d: number) => rv(screenWidth, m, t, d);
  const getBorderRadius = (c: CardSize) => {
    const base = u.r(R(18, 20, 22));
    return byCard(c, { extraSmall: clamp(base * 0.8, 8, 12), small: clamp(base, 10, 14), medium: clamp(base * 1.1, 12, 16), large: clamp(base * 1.2, 14, 18) });
  };
  const getPadding = (c: CardSize) => {
    const base = u.w(R(10, 12, 14));
    return byCard(c, { extraSmall: clamp(base * 0.8, 6, 8), small: clamp(base * 0.75, 8, 10), medium: clamp(base, 10, 12), large: clamp(base * 1.15, 12, 14) });
  };
  const getSmallPadding = (c: CardSize) => getPadding(c) * 0.4;
  const getSpacing = (c: CardSize) => {
    const base = u.h(R(4, 6, 8));
    return byCard(c, { extraSmall: clamp(base * 0.7, 3, 4), small: clamp(base * 0.85, 4, 6), medium: clamp(base, 6, 8), large: clamp(base * 1.15, 5, 7) });
  };
  const sp = (m: number, t: number, d: number) => u.sp(R(m, t, d));
  const getTitleFontSize = (c: CardSize) => { const b = sp(14, 17, 18);
    return byCard(c, { extraSmall: clamp(b * 0.82, 12.5, 13.5), small: clamp(b * 0.9, 14, 15), medium: clamp(b, 15, 17), large: clamp(b * 1.05, 16, 18) }); };
  const getDescriptionFontSize = (c: CardSize) => { const b = sp(12, 14, 15);
    return byCard(c, { extraSmall: clamp(b * 0.85, 10.5, 11.5), small: clamp(b * 0.9, 11, 12), medium: clamp(b, 12, 14), large: clamp(b * 1.1, 13, 15) }); };
  const getPriceFontSize = (c: CardSize) => { const b = sp(14, 16, 17);
    return byCard(c, { extraSmall: clamp(b * 0.92, 12.5, 14), small: clamp(b * 0.98, 13.5, 15), medium: clamp(b, 14, 17), large: clamp(b * 1.03, 15, 18) }); };
  const getButtonFontSize = (c: CardSize) => { const b = sp(14, 15, 16);
    return byCard(c, { extraSmall: clamp(b * 0.85, 11, 12), small: clamp(b * 0.92, 12, 13), medium: clamp(b, 13, 15), large: clamp(b * 1.03, 14, 16) }); };
  const getSmallFontSize = (c: CardSize) => { const b = sp(11, 12, 13);
    return byCard(c, { extraSmall: clamp(b * 0.9, 9.5, 10.5), small: clamp(b * 0.96, 10, 11), medium: clamp(b, 11, 13), large: clamp(b * 1.02, 11.5, 13.5) }); };
  const getIconSize = (c: CardSize) => { const b = sp(20, 22, 24);
    return byCard(c, { extraSmall: clamp(b * 0.8, 16, 20), small: clamp(b * 0.9, 18, 22), medium: clamp(b, 20, 24), large: clamp(b * 1.1, 22, 26) }); };
  const getSmallIconSize = (c: CardSize) => { const b = sp(10, 11, 12);
    return byCard(c, { extraSmall: clamp(b * 0.8, 8, 10), small: clamp(b * 0.9, 9, 11), medium: clamp(b, 10, 12), large: clamp(b * 1.1, 11, 13) }); };
  return { R, getBorderRadius, getPadding, getSmallPadding, getSpacing, getTitleFontSize, getDescriptionFontSize, getPriceFontSize,
    getButtonFontSize, getSmallFontSize, getIconSize, getSmallIconSize };
}
