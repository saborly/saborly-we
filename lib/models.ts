// Ported from lib/shared/models/*.dart. Parsing rules mirror the Dart factories 1:1.
export type LangCode = "en" | "es" | "ca" | "ar" | "fr";
const FALLBACK_ORDER: LangCode[] = ["en", "es", "ca", "ar", "fr"];

type Json = Record<string, any>;
const isMap = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);

/** Mirrors getLocalizedText() duplicated in FoodItem / FoodCategory / MealSize / Extra / Addon */
export function getLocalizedText(value: unknown, lang: string, fallback = "", anyValue = true): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value.length ? value : fallback;
  if (isMap(value)) {
    for (const code of [lang, ...FALLBACK_ORDER]) {
      const v = value[code];
      if (v != null && String(v).length) return String(v);
    }
    if (anyValue) {
      for (const v of Object.values(value)) if (v != null && String(v).length) return String(v);
    }
  }
  return fallback;
}

// ---- Offer ----
export interface SimpleOffer {
  id: string; title: string; type: string; value: number; badge: string;
  platforms: string[]; isOneTimePerDevice: boolean;
}
export function simpleOfferFromJson(j: Json): SimpleOffer {
  let platforms = ["all"];
  if (Array.isArray(j.platforms)) platforms = j.platforms.map(String);
  if (typeof j.id !== "string" || typeof j.title !== "string" || typeof j.type !== "string" ||
      typeof j.value !== "number" || typeof j.badge !== "string") {
    throw new Error("Invalid SimpleOffer"); // Dart cast would throw; FoodItem.fromMap catches -> null
  }
  return { id: j.id, title: j.title, type: j.type, value: j.value, badge: j.badge, platforms,
    isOneTimePerDevice: j.isOneTimePerDevice === true };
}
export const offerValidForPlatform = (platforms: string[], platform: string) =>
  platforms.length === 0 || platforms.includes("all") || platforms.includes(platform);

// ---- Food ----
export interface MealSize { id: string; name: string; additionalPrice: number }
export interface Extra { id: string; name: string; price: number }
export interface Addon { id: string; name: string; price: number; imageUrl: string }
export interface FoodItem {
  id: string; name: string; description: string; price: number; imageUrl: string; category: string;
  isVeg: boolean; isFeatured: boolean; isPopular: boolean; rating: number; reviewCount: number;
  offer: SimpleOffer | null; tags: string[]; mealSizes: MealSize[]; extras: Extra[]; addons: Addon[];
  availabilityStatus: string;
}

export const mealSizeFromMap = (m: Json, lang: string): MealSize => ({
  id: m.id != null ? String(m.id) : m._id != null ? String(m._id) : "",
  name: getLocalizedText(m.name, lang, "Unknown Size", false),
  additionalPrice: num(m.additionalPrice),
});
export const extraFromMap = (m: Json, lang: string): Extra => ({
  id: m.id != null ? String(m.id) : m._id != null ? String(m._id) : "",
  name: getLocalizedText(m.name, lang, "Unknown Extra", false),
  price: num(m.price),
});
export const addonFromMap = (m: Json, lang: string): Addon => ({
  id: m.id != null ? String(m.id) : m._id != null ? String(m._id) : "",
  name: getLocalizedText(m.name, lang, "Unknown Addon", false),
  price: num(m.price),
  imageUrl: m.imageUrl != null ? String(m.imageUrl) : "",
});

export function foodItemFromMap(map: Json, lang: string = "en"): FoodItem {
  const ml = isMap(map._multilingual) ? map._multilingual : null;
  let name = "Unknown Item";
  if (ml && ml.name != null) name = getLocalizedText(ml.name, lang, "Unknown Item");
  else if (map.name != null) name = getLocalizedText(map.name, lang, "Unknown Item");
  let description = "";
  if (ml && ml.description != null) description = getLocalizedText(ml.description, lang, "");
  else if (map.description != null) description = getLocalizedText(map.description, lang, "");

  let offer: SimpleOffer | null = null;
  if (map.offer != null && isMap(map.offer)) {
    try { offer = simpleOfferFromJson(map.offer); } catch { offer = null; }
  }

  let category = "";
  if (typeof map.category === "string") category = map.category;
  else if (isMap(map.category)) category = map.category._id?.toString() ?? map.category.id?.toString() ?? "";

  let rating = 0, reviewCount = 0;
  if (map.rating != null) {
    if (typeof map.rating === "number") {
      rating = map.rating;
      reviewCount = Math.trunc(Number(map.reviewCount ?? 0)) || 0;
    } else if (isMap(map.rating)) {
      rating = Number(map.rating.average ?? 0);
      reviewCount = Math.trunc(Number(map.rating.count ?? 0));
    }
  }

  const tags = Array.isArray(map.tags)
    ? map.tags.map((t: unknown) => getLocalizedText(t, lang, "")).filter((t: string) => t.length > 0)
    : [];

  let sizesList: any[] | null = null;
  if (ml && Array.isArray(ml.mealSizes)) sizesList = ml.mealSizes;
  else if (Array.isArray(map.mealSizes)) sizesList = map.mealSizes;
  const mealSizes = sizesList ? sizesList.filter(isMap).map((x) => mealSizeFromMap(x, lang)) : [];

  const extras = Array.isArray(map.extras)
    ? map.extras.filter((x: unknown) => isMap(x) && Object.keys(x).length > 0).map((x: Json) => extraFromMap(x, lang))
    : [];
  const addons = Array.isArray(map.addons)
    ? map.addons.filter((x: unknown) => isMap(x) && Object.keys(x).length > 0).map((x: Json) => addonFromMap(x, lang))
    : [];

  return {
    id: map._id?.toString() ?? map.id?.toString() ?? "",
    name, description, price: num(map.price), imageUrl: map.imageUrl != null ? String(map.imageUrl) : "",
    category, isVeg: map.isVeg ?? false, isFeatured: map.isFeatured ?? false, isPopular: map.isPopular ?? false,
    rating, reviewCount, offer, tags, mealSizes, extras, addons,
    availabilityStatus: map.availabilityStatus != null ? String(map.availabilityStatus) : "in-stock",
  };
}

// Platform-aware pricing (FoodItem.getEffectivePriceForPlatform and friends)
export function effectivePriceForPlatform(f: FoodItem, platform: string): number {
  if (!f.offer || !offerValidForPlatform(f.offer.platforms, platform)) return f.price;
  switch (f.offer.type) {
    case "percentage": return f.price * (1 - f.offer.value / 100);
    case "fixed-amount": return Math.max(0, f.price - f.offer.value);
    default: return f.price;
  }
}
export const discountAmountForPlatform = (f: FoodItem, p: string) => f.price - effectivePriceForPlatform(f, p);
/** Dart's double.round() rounds half away from zero; Math.round rounds half up — identical for non-negatives. */
export function discountPercentageForPlatform(f: FoodItem, p: string): number {
  if (!f.offer || f.price === 0 || !offerValidForPlatform(f.offer.platforms, p)) return 0;
  return Math.round((discountAmountForPlatform(f, p) / f.price) * 100);
}
export const hasActiveOfferForPlatform = (f: FoodItem, p: string) =>
  !!f.offer && offerValidForPlatform(f.offer.platforms, p) && discountAmountForPlatform(f, p) > 0;
// Deprecated (platform-less) variants — CartProvider.addItem still uses discountAmount
export function legacyEffectivePrice(f: FoodItem): number {
  if (!f.offer) return f.price;
  switch (f.offer.type) {
    case "percentage": return f.price * (1 - f.offer.value / 100);
    case "fixed-amount": return Math.max(0, f.price - f.offer.value);
    default: return f.price;
  }
}
export const legacyDiscountAmount = (f: FoodItem) => f.price - legacyEffectivePrice(f);

// ---- Category ----
export interface FoodCategory {
  id: string; name: string; description: string; imageUrl: string; icon: string;
  isActive: boolean; sortOrder: number; createdAt: string | null; updatedAt: string | null;
}
export function foodCategoryFromMap(map: Json, lang: string = "en"): FoodCategory {
  return {
    id: map._id ?? map.id ?? "",
    name: getLocalizedText(map.name, lang, "Unknown Category"),
    description: getLocalizedText(map.description, lang, ""),
    imageUrl: map.imageUrl ?? "",
    icon: map.icon ?? "🍔",
    isActive: map.isActive ?? true,
    sortOrder: Math.trunc(Number(map.sortOrder ?? 0)),
    createdAt: map.createdAt ?? null,
    updatedAt: map.updatedAt ?? null,
  };
}

// ---- Cart ----
export interface CartItem {
  id: string; foodItem: FoodItem; quantity: number; selectedMealSize: MealSize | null;
  selectedExtras: Extra[]; selectedAddons: Addon[]; specialInstructions: string | null;
  unitPrice: number; totalPrice: number;
}
export function cartItemFromMap(m: Json): CartItem {
  return {
    id: m.id ?? "",
    foodItem: foodItemFromMap(m.foodItem ?? {}),
    quantity: Math.trunc(Number(m.quantity ?? 1)),
    selectedMealSize: m.selectedMealSize != null ? mealSizeFromMap(m.selectedMealSize, "en") : null,
    selectedExtras: (m.selectedExtras ?? []).map((x: Json) => extraFromMap(x, "en")),
    selectedAddons: (m.selectedAddons ?? []).map((x: Json) => addonFromMap(x, "en")),
    specialInstructions: m.specialInstructions ?? null,
    unitPrice: Number(m.unitPrice ?? 0),
    totalPrice: Number(m.totalPrice ?? 0),
  };
}
/** CartItem.toMap — nested foodItem uses FoodItem.toMap shape (identical field names in TS). */
export const cartItemToMap = (c: CartItem) => ({ ...c });

// ---- User ----
export interface User { id: string; firstName: string; lastName: string; email: string; phone: string; token?: string | null }

// ---- Order ----
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "pickup" | "driverpickup" | "shop" |
  "outForDelivery" | "delivered" | "cancelled" | "refunded";
export type PaymentMethod = "cashOnDelivery" | "shop" | "card" | "paypal" | "stripe";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DeliveryType = "delivery" | "pickup";
export type CodPaymentType = "cash" | "card";

export function parseOrderStatus(s: unknown): OrderStatus {
  switch (String(s).toLowerCase()) {
    case "pending": return "pending"; case "confirmed": return "confirmed"; case "preparing": return "preparing";
    case "ready": return "ready"; case "pickup": return "pickup"; case "driverpickup": return "driverpickup";
    case "shop": return "shop";
    case "out-for-delivery": case "out_for_delivery": case "outfordelivery": return "outForDelivery";
    case "delivered": return "delivered"; case "cancelled": return "cancelled"; case "refunded": return "refunded";
    default: return "pending";
  }
}
export function parsePaymentMethod(s: unknown): PaymentMethod {
  switch (String(s).toLowerCase()) {
    case "cash-on-delivery": case "cash_on_delivery": case "cod": return "cashOnDelivery";
    case "card": return "card"; case "paypal": return "paypal"; case "stripe": return "stripe";
    default: return "cashOnDelivery";
  }
}
export function parsePaymentStatus(s: unknown): PaymentStatus {
  switch (String(s).toLowerCase()) {
    case "pending": return "pending"; case "paid": return "paid"; case "failed": return "failed";
    case "refunded": return "refunded"; default: return "pending";
  }
}
export function parseDeliveryType(s: unknown): DeliveryType {
  switch (String(s).toLowerCase()) {
    case "delivery": return "delivery"; case "pickup": case "takeaway": return "pickup"; default: return "delivery";
  }
}

export interface DeliveryAddress {
  id: string; type?: string | null; address: string; apartment?: string | null; instructions?: string | null;
  latitude?: number | null; longitude?: number | null; isDefault: boolean;
}
export const deliveryAddressFromMap = (m: Json): DeliveryAddress => ({
  id: m._id?.toString() ?? m.id?.toString() ?? "",
  type: m.type?.toString() ?? null,
  address: m.address?.toString() ?? "",
  apartment: m.apartment?.toString() ?? null,
  instructions: m.instructions?.toString() ?? null,
  latitude: m.latitude != null ? Number(m.latitude) : null,
  longitude: m.longitude != null ? Number(m.longitude) : null,
  isDefault: m.isDefault === true,
});

export interface Order {
  id: string; userId: string; user: User | null; items: CartItem[]; subtotal: number; deliveryFee: number;
  tax: number; discount: number; total: number; status: OrderStatus; paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus; deliveryType: DeliveryType; deliveryAddress: DeliveryAddress | null;
  specialInstructions: string | null; estimatedDeliveryTime: Date | null; actualDeliveryTime: Date | null;
  branchId: string; branchName: string | null; createdAt: Date; updatedAt: Date; codPaymentType: CodPaymentType | null;
}
export const userFromMap = (m: Json): User => ({
  id: (m.id ?? m._id ?? "").toString(), firstName: m.firstName ?? "", lastName: m.lastName ?? "",
  email: m.email ?? "", phone: m.phone ?? "", token: m.token ?? null,
});
export function orderFromMap(m: Json): Order {
  return {
    id: m._id ?? m.id ?? "",
    userId: typeof m.userId === "string" ? m.userId : m.userId?._id ?? "",
    user: isMap(m.userId) ? userFromMap(m.userId) : null,
    items: (m.items ?? []).map(cartItemFromMap),
    subtotal: Number(m.subtotal ?? 0), deliveryFee: Number(m.deliveryFee ?? 0), tax: Number(m.tax ?? 0),
    discount: Number(m.discount ?? 0), total: Number(m.total ?? 0),
    status: parseOrderStatus(m.status),
    paymentMethod: parsePaymentMethod(m.paymentMethod),
    paymentStatus: parsePaymentStatus(m.paymentStatus),
    deliveryType: parseDeliveryType(m.deliveryType),
    deliveryAddress: m.deliveryAddress != null ? deliveryAddressFromMap(m.deliveryAddress) : null,
    specialInstructions: m.specialInstructions ?? null,
    estimatedDeliveryTime: m.estimatedDeliveryTime ? new Date(m.estimatedDeliveryTime) : null,
    actualDeliveryTime: m.actualDeliveryTime ? new Date(m.actualDeliveryTime) : null,
    codPaymentType: m.codPaymentType != null ? (m.codPaymentType === "card" ? "card" : "cash") : null,
    branchId: m.branchId ?? "", branchName: m.branchName ?? null,
    createdAt: new Date(m.createdAt ?? Date.now()), updatedAt: new Date(m.updatedAt ?? Date.now()),
  };
}
