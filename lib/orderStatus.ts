// Port of order_status/widgets/order_status_helpers.dart (pure logic)
import { translate } from "./i18n";
import { Order, OrderStatus, PaymentMethod, PaymentStatus } from "./models";

/** calculateTimeRemaining(order, currentTime) */
export function calculateTimeRemaining(order: Order, currentTime: Date): string {
  if (order.status === "delivered" || order.status === "cancelled") return "0";
  const isSabadell = (order.branchName?.toLowerCase() ?? "").includes("sabadell");
  const defaultTime = isSabadell ? "45" : "30";
  const maxDisplay = isSabadell ? 60 : 40;
  if (!order.estimatedDeliveryTime) return defaultTime;
  const diffMs = order.estimatedDeliveryTime.getTime() - currentTime.getTime();
  if (diffMs < 0) return "0";
  const minutes = Math.trunc(diffMs / 60_000); // Duration.inMinutes truncates
  if (minutes <= 0) return "0";
  if (minutes <= 5) return "5";
  if (minutes <= maxDisplay) return String(minutes);
  return defaultTime;
}

const DELIVERY_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "pickup", "driverpickup", "outForDelivery", "delivered"];
const PICKUP_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "pickup", "shop", "delivered"];

export function isStatusCompleted(current: OrderStatus, check: OrderStatus): boolean {
  let ci = DELIVERY_FLOW.indexOf(current), ki = DELIVERY_FLOW.indexOf(check);
  if (ci === -1) { ci = PICKUP_FLOW.indexOf(current); ki = PICKUP_FLOW.indexOf(check); }
  if (check === "pickup" && ["driverpickup", "shop", "outForDelivery", "delivered"].includes(current)) return true;
  if (check === "driverpickup" && ["pickup", "outForDelivery", "delivered"].includes(current)) return true;
  if (check === "shop" && ["pickup", "delivered"].includes(current)) return true;
  if (check === "ready" && ["pickup", "shop", "driverpickup", "outForDelivery", "delivered"].includes(current)) return true;
  if (ci === -1 || ki === -1) return false;
  return ci >= ki;
}

export function formatOrderDate(date: Date, lang: string): string {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((k) => translate(k, lang));
  const hour = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12;
  const period = date.getHours() >= 12 ? translate("pm", lang) : translate("am", lang);
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${hour}:${String(date.getMinutes()).padStart(2, "0")} ${period}`;
}

export function getPaymentMethodText(m: PaymentMethod, lang: string): string {
  switch (m) {
    case "cashOnDelivery": case "shop": return translate("cashOnDelivery", lang);
    case "card": return "Card"; case "paypal": return "PayPal"; case "stripe": return "Stripe";
  }
}
export function getPaymentStatusText(s: PaymentStatus, lang: string): string {
  switch (s) { case "pending": return translate("unpaid", lang); case "paid": return translate("paid", lang); case "failed": return "Failed"; case "refunded": return "Refunded"; }
}
export function getStatusColor(s: OrderStatus): string {
  switch (s) {
    case "pending": return "#FF6F00"; case "confirmed": return "#1976D2"; case "preparing": return "#7B1FA2"; case "ready": return "#0097A7";
    case "pickup": return "#388E3C"; case "shop": return "#689F38"; case "outForDelivery": return "#303F9F"; case "driverpickup": return "#309F9F";
    case "delivered": return "#2E7D32"; case "cancelled": return "#C62828"; case "refunded": return "#616161";
  }
}
export function getStatusIcon(s: OrderStatus): string {
  switch (s) {
    case "pending": return "schedule_rounded"; case "confirmed": return "check_circle_outline_rounded"; case "preparing": return "restaurant_rounded";
    case "ready": return "shopping_bag_outlined"; case "pickup": case "shop": return "shopping_bag_rounded"; case "outForDelivery": return "local_shipping_rounded";
    case "driverpickup": return "drive_eta_outlined"; case "delivered": return "check_circle_rounded"; case "cancelled": return "cancel_rounded"; case "refunded": return "currency_exchange_rounded";
  }
}
