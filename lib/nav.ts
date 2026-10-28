"use client";
// go_router `extra` equivalent. Flutter passes objects (FoodItem, {category}, search query) via `extra`,
// which has no URL form. We keep them in memory and mirror to sessionStorage so a reload keeps working.
const KEY = "nav_extra:";
const mem = new Map<string, unknown>();

export function setExtra(path: string, value: unknown) {
  mem.set(path, value);
  try { sessionStorage.setItem(KEY + path, JSON.stringify(value)); } catch { /* ignore */ }
}
/** Read-and-clear: go_router `extra` belongs to one navigation, so it must not leak into later visits. */
export function consumeExtra<T>(path: string): T | null {
  const v = getExtra<T>(path);
  mem.delete(path);
  try { sessionStorage.removeItem(KEY + path); } catch { /* ignore */ }
  return v;
}
export function getExtra<T>(path: string): T | null {
  if (mem.has(path)) return mem.get(path) as T;
  try { const s = sessionStorage.getItem(KEY + path); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}

export const ROUTES = {
  splash: "/", branchSelect: "/branch-select", branchChange: "/branch-select?change=1", login: "/login", signup: "/signup", forgotPassword: "/forgot-password",
  resetPassword: "/reset-password", orders: "/orders", privacy: "/privacy", faq: "/faq", home: "/home", menu: "/menu",
  offer: "/offer", notifications: "/notifications", orderStatus: (id: string) => `/order-status/${id}`,
  orderTracking: (id: string) => `/order-tracking/${id}`, emailVerification: "/email-verification", about: "/about",
  contact: "/contact", search: "/search", foodDetail: "/food-detail", cart: "/cart", checkout: "/checkout",
  payment: "/payment", profile: "/profile", changePassword: "/change-password",
} as const;

// AppRoutes.router redirect(): only these exact paths are guarded. (The Dart list also holds the literal
// '/order-status/:orderId' patterns, which can never equal a concrete matchedLocation, so those two are not guarded.)
export const PROTECTED_ROUTES = ["/checkout", "/payment", "/profile"];

/**
 * MainLayout._shouldHideChrome hid the top/bottom navigation on auth, cart, checkout, detail and legal screens.
 * Product decision (post-migration): the navigation is shown on every page inside the shell.
 */
export function shouldHideChrome(_path: string): boolean {
  return false;
}

