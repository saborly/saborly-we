// Ported 1:1 from lib/core/constant/app_colors.dart (0xAARRGGBB -> css)
export const C = {
  primary: "#D84E17", primaryLight: "#FFC8A8", primaryDark: "#8C2F12",
  secondary: "#F5A623", secondaryLight: "#FFE2A8", secondaryDark: "#9D5A13",
  accentBerry: "#6A1638", accentCream: "#FFF4E8", accentSand: "#F6E4CF", accentLeaf: "#2F7A53", accentNight: "#2A1611",
  background: "#FBF3E7", surface: "#FFFFFF", cardBackground: "#FFFCF8",
  textDark: "#28140E", textMedium: "#72513E", textLight: "#A08371", textHint: "#C3AA97",
  success: "#4CAF50", warning: "#FF9800", error: "#F44336", info: "#2196F3",
  friendsFamily: "#FFE0B2", highOn: "#E8F5E8", duetCombos: "#FFF3E0", whopper: "#E3F2FD",
  premiumAccent: "#FFF7F2", muted: "#6B7280",
  border: "#E7D3BD", divider: "#F0E1D2",
  shadow: "rgba(26,8,3,0.1608)", // 0x291A0803 -> alpha 0x29/255
  shimmer: "#F0DFCF", shimmerHighlight: "#FFF8F1",
  white: "#FFFFFF", black: "#000000",
} as const;

export const G = {
  primary: "linear-gradient(135deg, #E46221, #B33E17)",
  hero: "linear-gradient(135deg, #4F1F14, #7B2F17, #D84E17)",
  surface: "linear-gradient(180deg, #FFF9F1, #FFF0E1)",
  card: "linear-gradient(180deg, #FFFFFF, #FFF5EA)",
} as const;

export const FOOD_CATEGORY_COLORS: Record<string, string> = {
  burger: "#FFE0B2", pizza: "#E8F5E8", chicken: "#FFF3E0", drinks: "#E3F2FD", dessert: "#F3E5F5", combo: "#E0F2F1",
};
export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800", confirmed: "#2196F3", preparing: "#FF5722", ready: "#9C27B0", delivered: "#4CAF50", cancelled: "#F44336",
};

/** Flutter Color.withOpacity(o) on a #RRGGBB */
export function withOpacity(hex: string, o: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.round(o * 255) / 255})`;
}
