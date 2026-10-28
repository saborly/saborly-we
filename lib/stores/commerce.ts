"use client";
// Ports of CheckoutProvider, PaymentProvider, OrderProvider, NotificationProvider.
import { api } from "../api";
import { API_BASE_URL } from "../config";
import {
  calculateDeliveryFee, calculateDistance, checkRestaurantHours, DEFAULT_SHOP, deliveryDistanceText, deliveryFeeText,
  MAX_DELIVERY_DISTANCE_KM,
} from "../delivery";
import { AppNotification, Branch, notificationFromMap } from "../offerModels";
import {
  CartItem, CodPaymentType, DeliveryAddress, DeliveryType, Order, OrderStatus, PaymentMethod, cartItemToMap,
} from "../models";
import { prefs } from "../storage";
import { Store, useStore } from "../store";
import { cartStore, clearCart, setDeliveryFee as setCartDeliveryFee } from "./cart";
import { getActiveDiscount, getDeviceId, loadOffers, markOfferAsClaimedLocally, offersStore, releaseDiscount } from "./offers";

export const addressToMap = (a: DeliveryAddress) => ({
  id: a.id, type: a.type ?? null, address: a.address, apartment: a.apartment ?? null, instructions: a.instructions ?? null,
  latitude: a.latitude ?? null, longitude: a.longitude ?? null, isDefault: a.isDefault,
});

// ======================= CheckoutProvider =======================
interface CheckoutState {
  isDeliveryEnabled: boolean; deliveryDisabledMessage: string | null; branches: Branch[]; selectedBranch: Branch | null;
  selectedAddress: DeliveryAddress | null; savedAddresses: DeliveryAddress[]; deliveryType: DeliveryType;
  selectedDeliveryDate: Date | null; selectedTimeSlot: string | null; isLoading: boolean; error: string | null;
  deliveryDistance: number | null; deliveryFee: number | null; shopLat: number; shopLng: number;
  isRestaurantOpen: boolean; restaurantClosedMessage: string | null;
}
export const checkoutStore = new Store<CheckoutState>({
  isDeliveryEnabled: true, deliveryDisabledMessage: null, branches: [], selectedBranch: null, selectedAddress: null,
  savedAddresses: [], deliveryType: "pickup", selectedDeliveryDate: null, selectedTimeSlot: null, isLoading: false, error: null,
  deliveryDistance: null, deliveryFee: null, shopLat: DEFAULT_SHOP.lat, shopLng: DEFAULT_SHOP.lng, isRestaurantOpen: true,
  restaurantClosedMessage: null,
});
const co = checkoutStore;
const cartSubtotal = () => cartStore.state.items.reduce((s, i) => s + i.totalPrice, 0);

function updateDeliveryFeeState(fee: number | null) {
  co.set({ deliveryFee: fee });
  if (fee != null) setCartDeliveryFee(fee); // _cartProvider!.setDeliveryFee(fee) only when fee != null
}
export const canDeliver = (s = co.state) => s.deliveryDistance != null && s.deliveryDistance <= MAX_DELIVERY_DISTANCE_KM;
export const canPlaceOrder = (s = co.state) => s.isDeliveryEnabled && s.isRestaurantOpen;
export function isReadyForOrder(s = co.state) {
  return s.deliveryType === "pickup" ? s.selectedBranch != null : s.selectedBranch != null && s.selectedAddress != null && canDeliver(s);
}
export const getDeliveryDistanceText = () => deliveryDistanceText(co.state.deliveryDistance);
export const getDeliveryFeeText = () => deliveryFeeText(co.state.deliveryFee);

function feeFor(orderTotal: number) {
  const s = co.state;
  return calculateDeliveryFee(s.deliveryType, s.selectedAddress != null, s.deliveryDistance, orderTotal);
}
export function recalculateDeliveryFee() {
  const s = co.state;
  if (s.selectedAddress && s.deliveryType === "delivery") {
    const a = s.selectedAddress;
    if (a.latitude != null && a.longitude != null) co.set({ deliveryDistance: calculateDistance(s.shopLat, s.shopLng, a.latitude, a.longitude) });
    updateDeliveryFeeState(feeFor(cartSubtotal()));
  }
}
/** CheckoutProvider.setCartProvider — invoked when the cart changes while delivering to an address */
export function onCartAttached() {
  if (co.state.deliveryType === "delivery" && co.state.selectedAddress) recalculateDeliveryFee();
}

export async function checkDeliveryAvailability() {
  refreshRestaurantHours();
  try {
    const r = await api.getPublicSettings();
    if (r.isSuccess && r.data) {
      const ds = r.data.deliverySettings;
      const enabled = ds ? (ds.isDeliveryEnabled ?? true) : true;
      const patch: Partial<CheckoutState> = { isDeliveryEnabled: enabled, deliveryDisabledMessage: ds?.disabledMessage ?? null };
      if (!enabled && co.state.deliveryType === "delivery") { patch.deliveryType = "pickup"; patch.deliveryFee = 0; }
      co.set(patch);
    }
  } catch { co.set({ isDeliveryEnabled: true }); }
}
export function refreshRestaurantHours() {
  const { isOpen, message } = checkRestaurantHours();
  co.set({ isRestaurantOpen: isOpen, restaurantClosedMessage: message });
}
let hoursMonitoringStarted = false;
export function startHoursMonitoring() {
  if (hoursMonitoringStarted) { refreshRestaurantHours(); return; }
  hoursMonitoringStarted = true;
  refreshRestaurantHours();
  setInterval(refreshRestaurantHours, 60_000);
}
export function clearAddress() {
  co.set({ selectedAddress: null, deliveryDistance: null });
  updateDeliveryFeeState(null);
}
export function setDeliveryType(type: DeliveryType) {
  if (type === "delivery" && !co.state.isDeliveryEnabled) return;
  co.set({ deliveryType: type });
  if (type === "pickup") { co.set({ deliveryFee: 0 }); clearAddress(); }
  else updateDeliveryFee(cartSubtotal());
}
export function updateDeliveryFee(orderTotal: number) {
  const s = co.state;
  if (s.deliveryType === "delivery" && s.selectedAddress) updateDeliveryFeeState(feeFor(orderTotal));
  else if (s.deliveryType === "pickup") updateDeliveryFeeState(0);
}
export async function loadBranches() {
  co.set({ isLoading: true, error: null });
  let b: Branch = { id: "1", name: "Saborly-Burgers", address: "Carrer de Pere IV, 208, Sant Martí, 08005 Barcelona, Spain",
    phone: "+34 932112072", latitude: co.state.shopLat, longitude: co.state.shopLng, isActive: true };
  // Use the branch the user actually picked (e.g. Sabadell); the placeholder above is only a fallback.
  try {
    const id = api.branchId;
    if (id) {
      const r = await api.request("GET", "/branches/public");
      const m = (r.data.branches ?? []).find((x: any) => `${x._id}` === id);
      if (m) {
        const isBcn = /barcelona/i.test(`${m.name}`) && !/sabadell/i.test(`${m.name} ${m.location ?? ""}`);
        b = { ...b, id, name: `${m.name}`, address: `${m.address || m.location || ""}`,
          phone: m.phone || (isBcn ? b.phone : ""),
          latitude: typeof m.latitude === "number" ? m.latitude : b.latitude,
          longitude: typeof m.longitude === "number" ? m.longitude : b.longitude };
      }
    }
  } catch { /* keep placeholder */ }
  co.set({ branches: [b], selectedBranch: b, isLoading: false });
}
export async function loadCurrentBranchCoords() {
  try {
    const id = api.branchId;
    if (!id) return;
    const r = await api.request("GET", "/branches/public");
    const match = (r.data.branches ?? []).find((b: any) => `${b._id}` === id);
    if (match && typeof match.latitude === "number" && typeof match.longitude === "number")
      co.set({ shopLat: match.latitude, shopLng: match.longitude });
  } catch { /* ignore */ }
}
export async function loadSavedAddresses() {
  co.set({ isLoading: true, error: null });
  try {
    const r = await api.getSavedAddresses();
    if (r.isSuccess && r.data) {
      co.set({ savedAddresses: r.data });
      const sel = co.state.selectedAddress;
      if (sel) {
        const updated = r.data.find((a) => a.id === sel.id) ?? sel;
        if (updated.latitude != null && updated.longitude != null) { co.set({ selectedAddress: updated }); recalculateDeliveryFee(); }
      }
    } else co.set({ savedAddresses: [] });
  } catch (e) { co.set({ error: `Failed to load addresses: ${String(e)}`, savedAddresses: [] }); }
  finally { co.set({ isLoading: false }); }
}
export async function saveAddress(address: DeliveryAddress): Promise<boolean> {
  try {
    const r = await api.saveAddress(addressToMap(address));
    if (r.isSuccess && r.data) {
      const list = [...co.state.savedAddresses];
      const i = list.findIndex((a) => a.id === r.data!.id);
      if (i >= 0) list[i] = r.data; else list.push(r.data);
      co.set({ savedAddresses: list });
      return true;
    }
    co.set({ error: r.error ?? "Failed to save address" }); return false;
  } catch (e) { co.set({ error: `Error saving address: ${String(e)}` }); return false; }
}
export async function deleteAddress(id: string): Promise<boolean> {
  try {
    const r = await api.deleteAddress(id);
    if (r.isSuccess) {
      co.set({ savedAddresses: co.state.savedAddresses.filter((a) => a.id !== id) });
      if (co.state.selectedAddress?.id === id) { co.set({ selectedAddress: null, deliveryDistance: null }); updateDeliveryFeeState(null); }
      return true;
    }
    co.set({ error: r.error ?? "Failed to delete address" }); return false;
  } catch (e) { co.set({ error: `Error deleting address: ${String(e)}` }); return false; }
}
export const selectBranch = (b: Branch) => co.set({ selectedBranch: b });
export function selectAddress(address: DeliveryAddress, orderTotal?: number) {
  co.set({ selectedAddress: address });
  if (address.latitude != null && address.longitude != null) {
    co.set({ deliveryDistance: calculateDistance(co.state.shopLat, co.state.shopLng, address.latitude, address.longitude) });
    updateDeliveryFeeState(feeFor(orderTotal ?? cartSubtotal()));
  } else { co.set({ deliveryDistance: null }); updateDeliveryFeeState(null); }
}
export const setDeliveryDate = (d: Date) => co.set({ selectedDeliveryDate: d });
export const setTimeSlot = (t: string) => co.set({ selectedTimeSlot: t });
export function seedFromDetectedLocation() {
  if (co.state.selectedAddress) return;
  const lat = api.selectedLat, lng = api.selectedLng;
  if (lat == null || lng == null) return;
  selectAddress({ id: "", address: api.selectedAddressText ?? "Your detected location", latitude: lat, longitude: lng, isDefault: false });
}
export async function setDefaultAddress(id: string): Promise<boolean> {
  try {
    const r = await api.setDefaultAddress(id);
    if (r.isSuccess && r.data) {
      co.set({ savedAddresses: co.state.savedAddresses.map((a) => ({ ...a, isDefault: a.id === id })) });
      return true;
    }
    co.set({ error: r.error ?? "Failed to set default address" }); return false;
  } catch (e) { co.set({ error: `Error setting default address: ${String(e)}` }); return false; }
}
export function resetCheckout() {
  co.set({ selectedAddress: null, deliveryDistance: null });
  updateDeliveryFeeState(null);
  co.set({ deliveryType: "pickup", selectedDeliveryDate: null, selectedTimeSlot: null, error: null });
}
export const useCheckout = () => useStore(checkoutStore);

// ======================= OrderProvider =======================
interface OrderState {
  orders: Order[]; currentOrder: Order | null; isLoading: boolean; isLoadingMore: boolean; error: string | null;
  currentPage: number; totalPages: number; hasMoreOrders: boolean;
}
export const orderStore = new Store<OrderState>({
  orders: [], currentOrder: null, isLoading: false, isLoadingMore: false, error: null, currentPage: 1, totalPages: 1, hasMoreOrders: false,
});
const os = orderStore;
export async function loadOrders(limit = 50) {
  os.set({ isLoading: true, error: null, currentPage: 1 });
  try {
    const r = await api.getOrders(1, limit);
    if (r.isSuccess && r.data) os.set({ orders: r.data, totalPages: 1, hasMoreOrders: r.data.length >= limit });
    else os.set({ error: r.error ?? "Failed to load orders" });
  } catch (e) { os.set({ error: `Error loading orders: ${String(e)}` }); }
  finally { os.set({ isLoading: false }); }
}
export async function loadMoreOrders(limit = 50) {
  if (os.state.isLoadingMore || !os.state.hasMoreOrders) return;
  os.set({ isLoadingMore: true, error: null });
  try {
    const next = os.state.currentPage + 1;
    const r = await api.getOrders(next, limit);
    if (r.isSuccess && r.data) {
      if (r.data.length) os.set({ orders: [...os.state.orders, ...r.data], currentPage: next, hasMoreOrders: r.data.length >= limit });
      else os.set({ hasMoreOrders: false });
    } else os.set({ error: r.error ?? "Failed to load more orders" });
  } catch (e) { os.set({ error: `Error loading more orders: ${String(e)}` }); }
  finally { os.set({ isLoadingMore: false }); }
}
export async function loadOrder(orderId: string, silent = false) {
  if (!silent) os.set({ isLoading: true, error: null });
  try {
    const r = await api.getOrder(orderId);
    if (r.isSuccess && r.data) {
      const list = os.state.orders.map((o) => (o.id === orderId ? r.data! : o));
      os.set({ currentOrder: r.data, orders: list });
    } else if (!silent) os.set({ error: r.error ?? "Order not found" });
  } catch (e) { if (!silent) os.set({ error: `Error loading order: ${String(e)}` }); }
  finally { if (!silent) os.set({ isLoading: false }); }
}
export async function createOrder(o: {
  items: CartItem[]; branchId: string; deliveryAddress?: DeliveryAddress | null; deliveryType: DeliveryType;
  paymentMethod: PaymentMethod; codPaymentType?: CodPaymentType | null; deliveryFee: number; specialInstructions?: string | null;
  deviceId?: string | null; platform?: string; applyFirstOrderDiscount?: boolean;
}): Promise<boolean> {
  os.set({ isLoading: true, error: null });
  try {
    const subtotal = o.items.reduce((s, i) => s + i.totalPrice, 0);
    const tax = 0, discount = 0, total = subtotal + o.deliveryFee + tax - discount;
    const toApiPm = (pm: PaymentMethod) => pm; // enum .name: cashOnDelivery | shop | card | paypal | stripe
    const data: Record<string, any> = {
      items: o.items.map(cartItemToMap), subtotal, deliveryFee: o.deliveryFee, tax, discount, total,
      deliveryType: o.deliveryType, paymentMethod: toApiPm(o.paymentMethod), paymentStatus: "pending", branchId: o.branchId,
      specialInstructions: o.specialInstructions ?? null,
      estimatedDeliveryTime: new Date(Date.now() + 40 * 60_000).toISOString(), platform: o.platform ?? "mobile",
    };
    if (o.deliveryType === "delivery" && o.deliveryAddress) data.deliveryAddress = addressToMap(o.deliveryAddress);
    if (o.paymentMethod === "cashOnDelivery" && o.codPaymentType) data.codPaymentType = o.codPaymentType;
    if (o.applyFirstOrderDiscount && o.deviceId != null) { data.applyFirstOrderDiscount = true; data.deviceId = o.deviceId; }
    const r = await api.createOrder(data);
    if (r.isSuccess && r.data) { os.set({ currentOrder: r.data, orders: [r.data, ...os.state.orders], isLoading: false }); return true; }
    os.set({ error: r.error ?? "Failed to create order", isLoading: false }); return false;
  } catch (e) { os.set({ error: `Error creating order: ${String(e)}`, isLoading: false }); return false; }
}
export const clearCurrentOrder = () => os.set({ currentOrder: null });
export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const now = new Date();
  if (os.state.currentOrder?.id === orderId) os.set({ currentOrder: { ...os.state.currentOrder, status, updatedAt: now } });
  os.set({ orders: os.state.orders.map((o) => (o.id === orderId ? { ...o, status, updatedAt: now } : o)) });
}
export const useOrders = () => useStore(orderStore);

// ======================= PaymentProvider =======================
export const DEFAULT_BRANCH_ID = "68dbd3f99bd73f7f7262664b";
export const SHOP_ADDRESS: DeliveryAddress = {
  id: "shop_main", type: "pickup", address: "SaborlyC/ de Pere IV, 208, Sant Martí, 08005 Barcelona, Spain",
  apartment: "+34932112072", isDefault: true,
};
interface PaymentState {
  selectedPaymentMethod: PaymentMethod; codPaymentType: CodPaymentType | null; isProcessing: boolean; error: string | null;
  orderId: string | null; specialInstructions: string | null;
}
export const paymentStore = new Store<PaymentState>({
  selectedPaymentMethod: "cashOnDelivery", codPaymentType: null, isProcessing: false, error: null, orderId: null, specialInstructions: null,
});
const ps = paymentStore;
/** PaymentProvider.initialize -> _updatePaymentMethodBasedOnDeliveryType (notifies only on change) */
export function syncPaymentMethodWithDeliveryType() {
  const dt = co.state.deliveryType;
  const pm: PaymentMethod = dt === "pickup" ? "shop" : "cashOnDelivery";
  const cod: CodPaymentType | null = dt === "pickup" ? null : "cash";
  if (pm === ps.state.selectedPaymentMethod && cod === ps.state.codPaymentType) return;
  ps.set({ selectedPaymentMethod: pm, codPaymentType: cod });
}
export const isPaymentMethodAvailable = (m: PaymentMethod) => (co.state.deliveryType === "pickup" ? m === "shop" : m === "cashOnDelivery");
export const getAvailablePaymentMethods = (): PaymentMethod[] => (co.state.deliveryType === "pickup" ? ["shop"] : ["cashOnDelivery"]);
export function selectPaymentMethod(m: PaymentMethod) {
  if (!isPaymentMethodAvailable(m)) return;
  const patch: Partial<PaymentState> = { selectedPaymentMethod: m };
  if (m !== "cashOnDelivery") patch.codPaymentType = null;
  else if (ps.state.codPaymentType == null) patch.codPaymentType = "cash";
  ps.set(patch);
}
export const setCodPaymentType = (t: CodPaymentType) => ps.set({ codPaymentType: t });
export const setSpecialInstructions = (s: string | null) => ps.set({ specialInstructions: s });
export function resetPayment() {
  ps.set({ selectedPaymentMethod: "cashOnDelivery", codPaymentType: null, isProcessing: false, error: null, orderId: null, specialInstructions: null });
}

export async function processPayment(): Promise<boolean> {
  ps.set({ isProcessing: true, error: null });
  try {
    const s = ps.state, c = co.state, items = cartStore.state.items;
    if (!isPaymentMethodAvailable(s.selectedPaymentMethod)) throw new Error("Selected payment method is not available");
    if (s.selectedPaymentMethod === "cashOnDelivery" && s.codPaymentType == null) throw new Error("Please select cash or card payment option");
    if (items.length === 0) throw new Error("Cart is empty");
    const deliveryType = c.deliveryType;
    const deliveryAddress = deliveryType === "delivery" ? c.selectedAddress : null;
    if (deliveryType === "delivery") {
      if (!deliveryAddress) throw new Error("Please select a delivery address");
      if (!canDeliver(c)) throw new Error("Selected address is beyond delivery range");
      if (s.selectedPaymentMethod !== "cashOnDelivery") throw new Error("Only Cash on Delivery is available for home delivery");
    } else if (s.selectedPaymentMethod !== "shop") throw new Error("Only Shop Payment is available for pickup orders");

    const deliveryFee = cartStore.state.deliveryFee;
    const activeDiscount = getActiveDiscount() ?? offersStore.state.activeDeviceDiscount;
    const offerIdsInCart: string[] = [];
    for (const ci of items) if (ci.foodItem.offer?.isOneTimePerDevice) offerIdsInCart.push(ci.foodItem.offer.id);
    const deviceId = getDeviceId() ?? "";
    // First-order mobile discount only applies to non-web (kIsWeb => skipped)

    const ok = await createOrder({
      items, branchId: api.branchId ?? DEFAULT_BRANCH_ID /* web deviation: use the branch the app loaded (Flutter's constant is no longer an active branch) */, deliveryAddress: deliveryType === "delivery" ? deliveryAddress : SHOP_ADDRESS, deliveryType,
      paymentMethod: s.selectedPaymentMethod, codPaymentType: s.codPaymentType, deliveryFee, specialInstructions: s.specialInstructions,
      deviceId: deviceId || null, platform: "web", applyFirstOrderDiscount: false,
    });
    if (!ok) throw new Error(os.state.error ?? "Failed to create order");
    const orderId = os.state.currentOrder?.id ?? null;
    ps.set({ orderId });
    if (!orderId) throw new Error("Order created but ID not available");

    await claimUsedOffers(activeDiscount, offerIdsInCart, orderId);
    clearCart();
    resetCheckout();
    ps.set({ isProcessing: false });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Dart: 'Order failed: ${e.toString()}' where e is Exception('msg') => "Exception: msg"
    ps.set({ error: `Order failed: Exception: ${msg}`, isProcessing: false });
    return false;
  }
}
async function claimUsedOffers(active: Record<string, any> | null, cartOfferIds: string[], orderId: string) {
  try {
    if (active) releaseDiscount();
    if (cartOfferIds.length) {
      for (const offerId of new Set(cartOfferIds)) {
        try {
          const deviceId = getDeviceId();
          if (!deviceId) throw new Error("Device ID not available");
          const r = await api.request("POST", `/offer/${offerId}/claim`, { body: { deviceId, orderId } });
          if (r.status !== 200) throw new Error("Failed to claim offer on backend");
          await markOfferAsClaimedLocally(offerId);
        } catch { /* a failed claim never fails the order */ }
      }
      await loadOffers();
    }
  } catch { /* ignore */ }
}
export const usePayment = () => useStore(paymentStore);

// ======================= NotificationProvider =======================
const NOTIF_KEY = "app_notifications", NOTIF_MAX = 100;
export const notificationStore = new Store<{ notifications: AppNotification[]; isLoading: boolean }>({ notifications: [], isLoading: false });
const ns = notificationStore;
const saveNotifs = () => { try { prefs.set(NOTIF_KEY, JSON.stringify(ns.state.notifications)); } catch { /* ignore */ } };
export function loadNotifications() {
  ns.set({ isLoading: true });
  try {
    const raw = prefs.getString(NOTIF_KEY);
    if (raw) {
      const list = (JSON.parse(raw) as any[]).map(notificationFromMap).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
      ns.set({ notifications: list });
    }
  } catch { /* ignore */ }
  ns.set({ isLoading: false });
}
export function addNotification(n: AppNotification) {
  const list = [n, ...ns.state.notifications].slice(0, NOTIF_MAX);
  ns.set({ notifications: list }); saveNotifs();
}
export function markNotificationAsRead(id: string) {
  ns.set({ notifications: ns.state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }); saveNotifs();
}
export function markAllNotificationsAsRead() { ns.set({ notifications: ns.state.notifications.map((n) => ({ ...n, isRead: true })) }); saveNotifs(); }
export function deleteNotification(id: string) { ns.set({ notifications: ns.state.notifications.filter((n) => n.id !== id) }); saveNotifs(); }
export function clearAllNotifications() { ns.set({ notifications: [] }); saveNotifs(); }
export const useNotifications = () => {
  const s = useStore(notificationStore);
  const unread = s.notifications.filter((n) => !n.isRead);
  return { ...s, unreadNotifications: unread, unreadCount: unread.length, hasNotifications: s.notifications.length > 0 };
};
void API_BASE_URL;
