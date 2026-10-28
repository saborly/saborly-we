// Pure rules from CheckoutProvider (lib/features/providers/checkout_provider.dart)
import { formatEeeeAtHmma, formatHmma, getNextOpeningTime, getSpainTime, isRestaurantOpen } from "./timeUtils";

export const MAX_DELIVERY_DISTANCE_KM = 3.5;
export const DEFAULT_SHOP = { lat: 41.3995, lng: 2.1909 };

/** Haversine exactly as _calculateDistance */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = 0.017453292519943295;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** calculateDeliveryFee: null = cannot deliver / unknown */
export function calculateDeliveryFee(
  deliveryType: "delivery" | "pickup", hasAddress: boolean, distanceKm: number | null, orderTotal: number,
): number | null {
  if (deliveryType === "pickup" || !hasAddress) return 0;
  if (distanceKm == null) return null;
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) return null;
  return orderTotal >= 20 ? 0 : 3.5;
}

export const deliveryDistanceText = (d: number | null) => (d == null ? null : `${d.toFixed(1)} km`);
export function deliveryFeeText(fee: number | null) {
  if (fee == null) return null;
  if (fee === 0) return "Free";
  return `€${fee.toFixed(2)}`;
}

/** _checkRestaurantHours -> { isOpen, message } */
export function checkRestaurantHours(now: Date = new Date()): { isOpen: boolean; message: string | null } {
  const open = isRestaurantOpen(now);
  if (open) return { isOpen: true, message: null };
  const next = getNextOpeningTime(now);
  if (!next) return { isOpen: false, message: "We're currently closed. Please check back later." };
  const spain = getSpainTime(now);
  // Dart compares day-of-month numbers (`nextOpening.day == spainTime.day + 1`), reproduced verbatim
  if (next.getUTCDate() === spain.getUTCDate()) return { isOpen: false, message: `We're currently closed. We open today at ${formatHmma(next)}` };
  if (next.getUTCDate() === spain.getUTCDate() + 1) return { isOpen: false, message: `We're currently closed. We open tomorrow at ${formatHmma(next)}` };
  return { isOpen: false, message: `We're currently closed. We open on ${formatEeeeAtHmma(next)}` };
}
