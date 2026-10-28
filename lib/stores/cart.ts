"use client";
import { CartItem, Addon, Extra, FoodItem, MealSize, cartItemFromMap, legacyDiscountAmount } from "../models";
import { prefs } from "../storage";
import { Store, useStore } from "../store";

const CART_KEY = "cart_items";
const FEE_KEY = "delivery_fee";

// Port of CartProvider. `items` is replaced immutably on each mutation (notifyListeners()).
export const cartStore = new Store<{ items: CartItem[]; deliveryFee: number; initialized: boolean }>({
  items: [], deliveryFee: 0, initialized: false,
});

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

// Equatable list equality: compare element-wise by value
const eqList = <T extends object>(a: T[], b: T[]) =>
  a.length === b.length && a.every((x, i) => JSON.stringify(x) === JSON.stringify(b[i]));

function saveCart(items: CartItem[]) { try { prefs.set(CART_KEY, JSON.stringify(items)); } catch { /* ignore */ } }

export function initCart() {
  if (cartStore.state.initialized) return;
  let items: CartItem[] = [];
  try {
    const raw = prefs.getString(CART_KEY);
    if (raw) items = (JSON.parse(raw) as any[]).map(cartItemFromMap);
  } catch { /* corrupt cart -> empty (Dart swallows) */ }
  const fee = prefs.getDouble(FEE_KEY) ?? 0;
  cartStore.set({ items, deliveryFee: fee, initialized: true });
}

export function setDeliveryFee(fee: number) { prefs.set(FEE_KEY, fee); cartStore.set({ deliveryFee: fee }); }

/** Pure price computation from CartProvider.addItem (kept bug-for-bug: the three branches are verbatim). */
export function computeUnitPrice(foodItem: FoodItem, size: MealSize | null, extras: Extra[], addons: Addon[]): number {
  const discount = legacyDiscountAmount(foodItem);
  let base = foodItem.price;
  if (size && size.additionalPrice <= 0) base += size.additionalPrice - discount;
  else if (size) base = size.additionalPrice - discount;
  else base = foodItem.price - discount;
  for (const e of extras) base += e.price;
  for (const a of addons) base += a.price;
  return base;
}

export function addItem(o: {
  foodItem: FoodItem; quantity?: number; selectedMealSize?: MealSize | null; selectedExtras?: Extra[];
  selectedAddons?: Addon[]; specialInstructions?: string | null;
}) {
  const quantity = o.quantity ?? 1, size = o.selectedMealSize ?? null, extras = o.selectedExtras ?? [], addons = o.selectedAddons ?? [];
  const note = o.specialInstructions ?? null;
  const unitPrice = computeUnitPrice(o.foodItem, size, extras, addons);
  const items = [...cartStore.state.items];
  const idx = items.findIndex((i) =>
    i.foodItem.id === o.foodItem.id && (i.selectedMealSize?.id ?? null) === (size?.id ?? null) &&
    eqList(i.selectedExtras, extras) && eqList(i.selectedAddons, addons) && i.specialInstructions === note);
  if (idx !== -1) {
    const q = items[idx].quantity + quantity;
    items[idx] = { ...items[idx], quantity: q, unitPrice, totalPrice: unitPrice * q };
  } else {
    items.push({ id: uuid(), foodItem: o.foodItem, quantity, selectedMealSize: size, selectedExtras: extras,
      selectedAddons: addons, specialInstructions: note, unitPrice, totalPrice: unitPrice * quantity });
  }
  saveCart(items); cartStore.set({ items });
}

export function removeItem(id: string) {
  const items = cartStore.state.items.filter((i) => i.id !== id);
  saveCart(items); cartStore.set({ items });
}
export function updateItemQuantity(id: string, q: number) {
  if (q <= 0) return removeItem(id);
  const items = cartStore.state.items.map((i) => (i.id === id ? { ...i, quantity: q, totalPrice: i.unitPrice * q } : i));
  saveCart(items); cartStore.set({ items });
}
export function clearCart() {
  prefs.set(FEE_KEY, 0); saveCart([]); cartStore.set({ items: [], deliveryFee: 0 });
}

export function useCart() {
  const s = useStore(cartStore);
  const subtotal = s.items.reduce((sum, i) => sum + i.totalPrice, 0);
  return {
    ...s, subtotal, total: subtotal + s.deliveryFee, itemCount: s.items.length,
    totalQuantity: s.items.reduce((n, i) => n + i.quantity, 0), isEmpty: s.items.length === 0,
    hasItem: (id: string) => s.items.some((i) => i.foodItem.id === id),
    getItemQuantity: (id: string) => s.items.filter((i) => i.foodItem.id === id).reduce((n, i) => n + i.quantity, 0),
  };
}
