// Ports of OfferModel, CategoryInfo, FoodItemWithOffer (offer.dart), OrderTrackingInfo, AppNotification, Branch
import { SimpleOffer, simpleOfferFromJson, offerValidForPlatform } from "./models";

type Json = Record<string, any>;

export interface OfferModel {
  id: string; title: string; description: string; badge: string; gradientColors: [string, string];
  imageUrl: string | null; expiryDate: Date | null; category: string; type: string; value: number | null;
  minOrderAmount: number; couponCode: string | null; isActive: boolean; isFeatured: boolean; platforms: string[];
  isOneTimePerDevice: boolean; comboPrice: number | null;
}

function hexToRgba(hex: string, opacity: number): string {
  let h = hex.replace(/#/g, "");
  if (h.length === 6) h = "FF" + h;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) throw new Error("bad hex");
  const a = ((n >>> 24) & 0xff) / 255 * opacity, r = (n >>> 16) & 0xff, g = (n >>> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${Math.round(a * 255) / 255})`;
}
function solidFromHex(hex: string): string {
  let h = hex.replace(/#/g, "");
  if (h.length === 6) h = "FF" + h;
  if (Number.isNaN(parseInt(h, 16))) throw new Error("bad hex");
  return `#${h.slice(2)}`;
}

/** _getGradientColors(bannerColor, type) */
export function offerGradientColors(bannerColor: string | null | undefined, type: string): [string, string] {
  if (bannerColor) {
    try { return [solidFromHex(bannerColor), hexToRgba(bannerColor, 0.7)]; } catch { /* fall back */ }
  }
  switch (type) {
    case "percentage": case "fixed-amount": return ["#7ED4AD", "#6BCF7F"];
    case "buy-one-get-one": return ["#E91E63", "#9C27B0"];
    case "free-delivery": return ["#2196F3", "#3F51B5"];
    case "combo": return ["#FFC107", "#FF9800"];
    default: return ["#7ED4AD", "#6BCF7F"];
  }
}

/** OfferProvider._parseOfferFromApi (also OfferModel.fromJson, which lacks comboPrice) */
export function offerFromApi(json: Json): OfferModel {
  const type: string = json.type;
  if (typeof type !== "string" || typeof json._id !== "string" || typeof json.title !== "string" || typeof json.description !== "string")
    throw new Error("Invalid offer"); // Dart `as String` casts throw
  let badge = "", category = "general";
  switch (type) {
    case "percentage": badge = `SAVE ${fmtNum(json.value)}%`; category = "food"; break;
    case "fixed-amount": badge = `$${fmtNum(json.value)} OFF`; category = "food"; break;
    case "buy-one-get-one": badge = "BUY 1 GET 1"; category = "food"; break;
    case "free-delivery": badge = "FREE DELIVERY"; category = "delivery"; break;
    case "combo": badge = "COMBO DEAL"; category = "combo"; break;
    default: badge = "SPECIAL OFFER";
  }
  return {
    id: json._id, title: json.title, description: json.description, badge,
    gradientColors: offerGradientColors(json.bannerColor, type),
    imageUrl: json.imageUrl ?? null, expiryDate: json.endDate != null ? new Date(json.endDate) : null,
    category, type, value: json.value != null ? Number(json.value) : null,
    minOrderAmount: json.minOrderAmount != null ? Number(json.minOrderAmount) : 0,
    couponCode: json.couponCode ?? null, isActive: json.isActive ?? true, isFeatured: json.isFeatured ?? false,
    platforms: Array.isArray(json.platforms) ? json.platforms.map(String) : ["all"],
    isOneTimePerDevice: json.isOneTimePerDevice ?? false,
    comboPrice: json.comboPrice != null ? Number(json.comboPrice) : null,
  };
}
/** Dart string interpolation of a num: ints print "10", doubles "10.0" (JSON numbers arrive as int when whole). */
function fmtNum(v: unknown): string { return v == null ? "null" : String(v); }

export const isOfferExpired = (o: OfferModel) => (o.expiryDate ? o.expiryDate.getTime() < Date.now() : false);
export const isOfferValid = (o: OfferModel) => o.isActive && !isOfferExpired(o);
export function offerDisplayDiscount(o: OfferModel): string {
  const v = o.value == null ? "null" : String(Math.trunc(o.value));
  switch (o.type) {
    case "percentage": return `${v}% OFF`;
    case "fixed-amount": return `$${v} OFF`;
    case "buy-one-get-one": return "Buy 1 Get 1 Free";
    case "free-delivery": return "Free Delivery";
    case "combo": return "Special Combo Deal";
    default: return "Special Offer";
  }
}
export const offerValidForPlatformModel = (o: OfferModel, p: string) => offerValidForPlatform(o.platforms, p);

// ---- FoodItemWithOffer ----
export interface CategoryInfo { id: string; name: string; icon: string | null }
export interface FoodItemWithOffer {
  id: string; name: string; description: string; price: number; imageUrl: string; category: CategoryInfo;
  isActive: boolean; offer: SimpleOffer | null; discountedPrice: number; savings: number; discountPercentage: number;
}
function textInLanguage(value: unknown, lang: string, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value.length ? value : fallback;
  if (typeof value === "object") {
    const m = value as Json;
    if (m[lang] != null) { const t = String(m[lang]).trim(); if (t) return t; }
    for (const l of ["en", "es", "ca", "ar", "fr"]) if (m[l] != null) { const t = String(m[l]).trim(); if (t) return t; }
  }
  return fallback;
}
export function categoryInfoFromJson(json: Json, lang = "es"): CategoryInfo {
  try {
    const name = json.name && typeof json.name === "object" ? textInLanguage(json.name, lang, "Unknown") : json.name?.toString() ?? "Unknown";
    return { id: json._id?.toString() ?? json.id?.toString() ?? "", name, icon: json.icon?.toString() ?? null };
  } catch { return { id: "unknown", name: "Unknown Category", icon: null }; }
}
export function foodItemWithOfferFromJson(json: Json, lang = "es"): FoodItemWithOffer {
  const price = typeof json.price === "number" ? json.price : 0;
  return {
    id: json._id?.toString() ?? json.id?.toString() ?? "",
    name: textInLanguage(json.name, lang, "Unknown Item"),
    description: textInLanguage(json.description, lang, ""),
    price,
    imageUrl: json.imageUrl?.toString() ?? "",
    category: json.category && typeof json.category === "object" && !Array.isArray(json.category)
      ? categoryInfoFromJson(json.category, lang) : { id: "unknown", name: "Unknown Category", icon: null },
    isActive: json.isActive ?? true,
    offer: json.offer && typeof json.offer === "object" ? simpleOfferFromJson(json.offer) : null,
    discountedPrice: typeof json.discountedPrice === "number" ? json.discountedPrice : typeof json.price === "number" ? json.price : 0,
    savings: typeof json.savings === "number" ? json.savings : 0,
    discountPercentage: Number.isInteger(json.discountPercentage) ? json.discountPercentage : 0,
  };
}

// ---- Branch ----
export interface Branch {
  id: string; name: string; address: string; phone: string; email?: string | null; latitude: number; longitude: number;
  isActive: boolean; imageUrl?: string | null; openingHours?: Record<string, string> | null; features?: string[] | null;
}

// ---- Notification ----
export interface AppNotification {
  id: string; title: string; body: string; type: string; data: Record<string, any>; timestamp: string; isRead: boolean; imageUrl?: string | null;
}
export const notificationFromMap = (m: Json): AppNotification => ({
  id: m.id?.toString() ?? String(Date.now()), title: m.title ?? "", body: m.body ?? "", type: m.type ?? "general",
  data: { ...(m.data ?? {}) }, timestamp: m.timestamp ?? new Date().toISOString(), isRead: m.isRead ?? false, imageUrl: m.imageUrl ?? null,
});

// ---- Order tracking ----
export interface OrderTrackingInfo {
  orderId: string; status: string; trackingStage: number; trackingStageLabel: string; driverId: string | null;
  driverName: string | null; driverPhone: string | null; vehicleType: string | null; latitude: number | null;
  longitude: number | null; heading: number | null; isLive: boolean; isStale: boolean; startedAt: Date | null;
  branchName: string | null; branchLatitude: number | null; branchLongitude: number | null;
  destinationLatitude: number | null; destinationLongitude: number | null; destinationAddress: string | null;
  estimatedDeliveryTime: Date | null; updatedAt: Date;
}
const nn = (v: unknown) => (typeof v === "number" ? v : null);
const tryDate = (v: unknown) => { if (v == null) return null; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d; };
export function trackingFromMap(map: Json): OrderTrackingInfo {
  const driver = map.driver ?? null, loc = map.location ?? null, branch = map.branch ?? null, dest = map.destination ?? null;
  return {
    orderId: String(map.orderId ?? ""), status: map.status ?? "pending", trackingStage: Math.trunc(nn(map.trackingStage) ?? 0),
    trackingStageLabel: map.trackingStageLabel ?? "", driverId: driver?.id?.toString() ?? null,
    driverName: driver ? `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim() : null,
    driverPhone: driver?.phone ?? null, vehicleType: driver?.vehicleType ?? null,
    latitude: nn(loc?.latitude), longitude: nn(loc?.longitude), heading: nn(loc?.heading),
    isLive: map.isLive ?? false, isStale: map.isStale ?? false, startedAt: tryDate(map.startedAt),
    branchName: branch?.name ?? null, branchLatitude: nn(branch?.latitude), branchLongitude: nn(branch?.longitude),
    destinationLatitude: nn(dest?.latitude), destinationLongitude: nn(dest?.longitude), destinationAddress: dest?.address ?? null,
    estimatedDeliveryTime: tryDate(map.estimatedDeliveryTime), updatedAt: new Date(),
  };
}
export const trackingWithLocation = (t: OrderTrackingInfo, p: Json): OrderTrackingInfo => ({
  ...t, latitude: nn(p.latitude) ?? t.latitude, longitude: nn(p.longitude) ?? t.longitude, heading: nn(p.heading) ?? t.heading,
  isLive: true, isStale: false, updatedAt: new Date(),
});
export const trackingWithStatus = (t: OrderTrackingInfo, p: Json): OrderTrackingInfo => ({
  ...t, status: p.status ?? t.status, trackingStage: nn(p.trackingStage) != null ? Math.trunc(p.trackingStage) : t.trackingStage,
  trackingStageLabel: p.trackingStageLabel ?? t.trackingStageLabel, updatedAt: new Date(),
});
export const trackingIsTerminal = (t: OrderTrackingInfo) => ["delivered", "cancelled", "refunded"].includes(t.status);
