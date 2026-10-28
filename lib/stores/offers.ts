"use client";
// Ports of OffersProvider + DeviceDiscountManager (lib/features/providers/offer_provider.dart,
// lib/core/services/device_discount_manager.dart). Web platform => 'web'.
import { api } from "../api";
import { API_BASE_URL } from "../config";
import { FoodItemWithOffer, OfferModel, foodItemWithOfferFromJson, offerFromApi } from "../offerModels";
import { prefs } from "../storage";
import { Store, useStore } from "../store";

const K_ACTIVE = "active_discount", K_HISTORY = "discount_history", K_DEVICE = "device_id", K_CLAIMED = "claimed_offers";

function parseJson<T>(s: string | null, d: T): T { try { return s ? (JSON.parse(s) as T) : d; } catch { return d; } }

// ---- DeviceDiscountManager ----
function javaStyleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
let deviceId: string | null = null;
export function initDeviceId() {
  deviceId = prefs.getString(K_DEVICE);
  if (!deviceId) {
    try {
      deviceId = String(Math.abs(javaStyleHash(`web_${navigator.userAgent}`)));
    } catch { deviceId = `fallback_${Date.now()}`; }
    prefs.set(K_DEVICE, deviceId);
  }
}
const claimedHistory = (): any[] => parseJson<any[]>(prefs.getString(K_CLAIMED), []);
export const getClaimedOfferIds = (): Set<string> =>
  new Set(claimedHistory().map((i) => i?.offerId).filter((x): x is string => typeof x === "string"));
export function markOfferAsClaimed(offerId: string, offerTitle?: string, userId?: string): boolean {
  const list = claimedHistory();
  if (list.some((i) => i.offerId === offerId)) return false;
  list.push({ offerId, offerTitle: offerTitle ?? null, claimedAt: new Date().toISOString(), userId: userId ?? null, deviceId });
  prefs.set(K_CLAIMED, JSON.stringify(list));
  return true;
}
export function getActiveDiscount(): Record<string, any> | null {
  const d = parseJson<Record<string, any> | null>(prefs.getString(K_ACTIVE), null);
  if (!d) return null;
  if (d.expiryDate != null && new Date(d.expiryDate).getTime() < Date.now()) { clearActiveDiscount(); return null; }
  return d;
}
export const clearActiveDiscount = () => prefs.remove(K_ACTIVE);
export const getDiscountHistory = (): any[] => parseJson<any[]>(prefs.getString(K_HISTORY), []);

// ---- OffersProvider ----
export const offersStore = new Store<{
  allOffersRaw: OfferModel[]; itemsWithOffersRaw: FoodItemWithOffer[]; isLoading: boolean; error: string | null;
  claimedOfferIds: string[]; activeDeviceDiscount: Record<string, any> | null; isInitialized: boolean; deviceId: string | null;
}>({ allOffersRaw: [], itemsWithOffersRaw: [], isLoading: false, error: null, claimedOfferIds: [], activeDeviceDiscount: null, isInitialized: false, deviceId: null });

const lang = () => api.getCurrentLanguage();
const diskKeyOffers = () => `offers_cache_v1_offers_${lang()}`;
const diskKeyItems = () => `offers_cache_v1_items_${lang()}`;
const filterClaimedOffers = (offers: OfferModel[], claimed: string[]) =>
  offers.filter((o) => !o.isOneTimePerDevice || !claimed.includes(o.id));
const filterClaimedItems = (items: FoodItemWithOffer[], claimed: string[]) =>
  items.filter((i) => !i.offer || !i.offer.isOneTimePerDevice || !claimed.includes(i.offer.id));

export async function initializeOffers() {
  if (offersStore.state.isInitialized) return;
  try {
    initDeviceId();
    const active = getActiveDiscount();
    const claimed = [...getClaimedOfferIds()];
    offersStore.set({ activeDeviceDiscount: active, claimedOfferIds: claimed, deviceId });
    await syncClaimedOffersWithBackend();
    offersStore.set({ isInitialized: true });
  } catch (e) {
    offersStore.set({ error: `Failed to initialize: ${String(e)}` });
  }
}

export async function syncClaimedOffersWithBackend() {
  if (!deviceId) return;
  try {
    const res = await fetchTimeout(`${API_BASE_URL}/offer/device-claims?deviceId=${deviceId}`, { headers: { "Content-Type": "application/json" } }, 10000);
    if (res.status === 200) {
      const data = await res.json();
      if (data.success === true) {
        const ids: string[] = (data.claimedOffers ?? []).map((o: any) => o.offerId).filter((x: unknown) => typeof x === "string");
        const merged = new Set([...offersStore.state.claimedOfferIds, ...ids]);
        for (const id of ids) if (!getClaimedOfferIds().has(id)) markOfferAsClaimed(id);
        offersStore.set({ claimedOfferIds: [...merged] });
      }
    }
  } catch { /* continue with local data */ }
}

export async function fetchTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

export async function markOfferAsClaimedLocally(offerId: string) {
  const ids = new Set(offersStore.state.claimedOfferIds); ids.add(offerId);
  markOfferAsClaimed(offerId, `Offer ${offerId}`);
  offersStore.set({ claimedOfferIds: [...ids] });
}
export async function claimDiscount(o: {
  offerId: string; offerTitle: string; offerType: string; discountValue: number; expiryDate?: Date | null;
  itemId?: string; itemName?: string; isOneTimeOffer?: boolean;
}): Promise<boolean> {
  if (!offersStore.state.isInitialized) await initializeOffers();
  // DeviceDiscountManager.claimDiscount
  if (getActiveDiscount()) return false;
  if (o.isOneTimeOffer && getClaimedOfferIds().has(o.offerId)) return false;
  const discount = {
    offerId: o.offerId, offerTitle: o.offerTitle, offerType: o.offerType, discountValue: o.discountValue,
    expiryDate: o.expiryDate ? o.expiryDate.toISOString() : null, claimedAt: new Date().toISOString(),
    itemId: o.itemId ?? null, itemName: o.itemName ?? null, deviceId, isOneTimeOffer: o.isOneTimeOffer ?? false,
  };
  prefs.set(K_ACTIVE, JSON.stringify(discount));
  const history = getDiscountHistory();
  history.unshift({ ...discount, usedAt: new Date().toISOString() });
  if (history.length > 50) history.splice(50);
  prefs.set(K_HISTORY, JSON.stringify(history));
  if (o.isOneTimeOffer) markOfferAsClaimed(o.offerId, o.offerTitle);
  const claimed = new Set(offersStore.state.claimedOfferIds);
  if (o.isOneTimeOffer) claimed.add(o.offerId);
  offersStore.set({ activeDeviceDiscount: getActiveDiscount(), claimedOfferIds: [...claimed] });
  return true;
}
export function releaseDiscount() { clearActiveDiscount(); offersStore.set({ activeDeviceDiscount: null }); }
export async function canClaimDiscount() {
  if (!deviceId) await initializeOffers();
  return !getActiveDiscount();
}

function hydrateOffersFromDisk() {
  try {
    const a = prefs.getString(diskKeyOffers()), b = prefs.getString(diskKeyItems());
    const patch: any = {}; let changed = false;
    if (a != null) { patch.allOffersRaw = (JSON.parse(a) as any[]).map(offerFromApi); changed = true; }
    if (b != null) {
      patch.itemsWithOffersRaw = (JSON.parse(b) as any[]).flatMap((j) => { try { return [foodItemWithOfferFromJson(j, lang())]; } catch { return []; } });
      changed = true;
    }
    if (changed) offersStore.set(patch);
  } catch { /* corrupt cache */ }
}

export async function loadOffers() {
  if (!offersStore.state.isInitialized) await initializeOffers();
  hydrateOffersFromDisk();
  offersStore.set({ isLoading: true, error: null });
  try {
    await Promise.all([loadMainOffers(), loadItems()]);
  } catch (e) {
    offersStore.set({ error: `Failed to load offers: ${String(e)}` });
  } finally { offersStore.set({ isLoading: false }); }
}
async function loadMainOffers() {
  try {
    const res = await fetchTimeout(`${API_BASE_URL}/offer?platform=web&deviceId=${deviceId ?? ""}`,
      { headers: { "Content-Type": "application/json", "X-Language": lang() } }, 10000);
    if (res.status === 200) {
      const data = await res.json();
      if (data.success === true) {
        const raw: any[] = data.offers ?? [];
        offersStore.set({ allOffersRaw: raw.map(offerFromApi) });
        prefs.set(diskKeyOffers(), JSON.stringify(raw));
      } else offersStore.set({ error: data.message ?? "Failed to load main offers" });
    } else offersStore.set({ error: `Server error: ${res.status}` });
  } catch { offersStore.set({ allOffersRaw: [] }); }
}
async function loadItems() {
  try {
    const res = await fetchTimeout(`${API_BASE_URL}/offer/items-with-offers?platform=web&deviceId=${deviceId ?? ""}&includeUnavailable=false`,
      { headers: { "Content-Type": "application/json", "X-Language": lang() } }, 10000);
    if (res.status === 200) {
      const data = await res.json();
      if (data.success === true) {
        const raw: any[] = data.items ?? [];
        if (raw.length === 0) { offersStore.set({ itemsWithOffersRaw: [] }); prefs.set(diskKeyItems(), JSON.stringify(raw)); }
        else {
          offersStore.set({ itemsWithOffersRaw: raw.flatMap((j) => { try { return [foodItemWithOfferFromJson(j, lang())]; } catch { return []; } }) });
          prefs.set(diskKeyItems(), JSON.stringify(raw));
        }
      } else offersStore.set({ error: data.message ?? "Failed to load items with offers", itemsWithOffersRaw: [] });
    } else offersStore.set({ error: `Server error: ${res.status}`, itemsWithOffersRaw: [] });
  } catch { offersStore.set({ itemsWithOffersRaw: [] }); }
}

export async function validateCouponCode(couponCode: string, o: { subtotal: number; deliveryType?: string }): Promise<Record<string, any> | null> {
  if (!offersStore.state.isInitialized) await initializeOffers();
  const active = getActiveDiscount();
  if (active) return { success: false, message: `You already have an active discount: ${active.offerTitle}`, hasActiveDiscount: true };
  try {
    const res = await fetchTimeout(`${API_BASE_URL}/offer/validate-coupon`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode, platform: "web", deviceId, orderDetails: { subtotal: o.subtotal, deliveryType: o.deliveryType ?? "pickup" } }),
    }, 10000);
    if (res.status === 200) { const d = await res.json(); if (d.success === true) return d; }
    return null;
  } catch { return null; }
}

export function setOffersLanguage(_code: string) { offersStore.set({}); }
export const clearOffersError = () => offersStore.set({ error: null });

export function useOffers() {
  const s = useStore(offersStore);
  const allOffers = filterClaimedOffers(s.allOffersRaw, s.claimedOfferIds);
  const itemsWithOffers = filterClaimedItems(s.itemsWithOffersRaw, s.claimedOfferIds);
  return {
    ...s, allOffers, itemsWithOffers, hasActiveDiscount: s.activeDeviceDiscount != null,
    foodOffers: filterClaimedOffers(s.allOffersRaw.filter((o) => o.category === "food" || o.type === "percentage" || o.type === "fixed-amount"), s.claimedOfferIds),
    limitedTimeOffers: filterClaimedOffers(s.allOffersRaw.filter((o) => o.expiryDate != null && o.expiryDate.getTime() > Date.now()), s.claimedOfferIds),
    isOfferClaimedByDevice: (id: string) => s.claimedOfferIds.includes(id),
    getItemsByCategory: (cid: string) => itemsWithOffers.filter((i) => i.category.id === cid),
    getBestDiscounts: (limit = 10) => [...itemsWithOffers].sort((a, b) => b.discountPercentage - a.discountPercentage).slice(0, limit),
    filterByMinDiscount: (min: number) => itemsWithOffers.filter((i) => i.discountPercentage >= min),
  };
}
export const getDeviceId = () => deviceId;
