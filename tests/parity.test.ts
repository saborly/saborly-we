import { describe, expect, it } from "vitest";
import { calculateDeliveryFee, calculateDistance, deliveryFeeText, MAX_DELIVERY_DISTANCE_KM } from "@/lib/delivery";
import { dartStringHash, hashIndex } from "@/lib/dart";
import { calculateTimeRemaining, isStatusCompleted } from "@/lib/orderStatus";
import { timeagoFormat } from "@/lib/timeago";
import { formatDateTime } from "@/components/screens/OrderHistoryScreen";
import { validateNewPassword, passwordStrength } from "@/components/auth/password";

// Expected values are derived by hand from the Dart sources named in each describe block.

describe("checkout_provider.dart delivery fee / haversine", () => {
  it("pickup and no-address are free", () => {
    expect(calculateDeliveryFee("pickup", true, 1, 5)).toBe(0);
    expect(calculateDeliveryFee("delivery", false, null, 5)).toBe(0);
  });
  it("applies 3.5 fee under 20 and free at 20+", () => {
    expect(calculateDeliveryFee("delivery", true, 1, 19.99)).toBe(3.5);
    expect(calculateDeliveryFee("delivery", true, 1, 20)).toBe(0);
  });
  it("rejects beyond max distance or unknown distance", () => {
    expect(calculateDeliveryFee("delivery", true, MAX_DELIVERY_DISTANCE_KM + 0.01, 30)).toBeNull();
    expect(calculateDeliveryFee("delivery", true, null, 30)).toBeNull();
  });
  it("haversine: zero distance and ~1 degree latitude", () => {
    expect(calculateDistance(41, 2, 41, 2)).toBe(0);
    expect(calculateDistance(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });
  it("fee text", () => {
    expect(deliveryFeeText(0)).toBe("Free");
    expect(deliveryFeeText(3.5)).toBe("€3.50");
    expect(deliveryFeeText(null)).toBeNull();
  });
});

describe("dart2js String.hashCode", () => {
  it("is deterministic, 29-bit and empty string is 0", () => {
    expect(dartStringHash("")).toBe(0);
    expect(dartStringHash("Burgers")).toBe(dartStringHash("Burgers"));
    expect(dartStringHash("Burgers")).toBeLessThan(2 ** 29);
    expect(hashIndex("Burgers", 5)).toBeLessThan(5);
  });
});

describe("order_status_helpers.dart", () => {
  const base: any = { status: "pending", branchName: "Barcelona", estimatedDeliveryTime: null };
  const now = new Date("2026-01-01T12:00:00Z");
  it("terminal states show 0", () => {
    expect(calculateTimeRemaining({ ...base, status: "delivered" }, now)).toBe("0");
    expect(calculateTimeRemaining({ ...base, status: "cancelled" }, now)).toBe("0");
  });
  it("defaults by branch", () => {
    expect(calculateTimeRemaining(base, now)).toBe("30");
    expect(calculateTimeRemaining({ ...base, branchName: "Sabadell" }, now)).toBe("45");
  });
  it("clamps ETA", () => {
    const eta = (m: number) => new Date(now.getTime() + m * 60_000);
    expect(calculateTimeRemaining({ ...base, estimatedDeliveryTime: eta(-1) }, now)).toBe("0");
    expect(calculateTimeRemaining({ ...base, estimatedDeliveryTime: eta(3) }, now)).toBe("5");
    expect(calculateTimeRemaining({ ...base, estimatedDeliveryTime: eta(25) }, now)).toBe("25");
    expect(calculateTimeRemaining({ ...base, estimatedDeliveryTime: eta(90) }, now)).toBe("30");
  });
  it("status completion", () => {
    expect(isStatusCompleted("delivered", "pending")).toBe(true);
    expect(isStatusCompleted("pending", "confirmed")).toBe(false);
    expect(isStatusCompleted("outForDelivery", "ready")).toBe(true);
    expect(isStatusCompleted("driverpickup", "pickup")).toBe(true);
  });
});

describe("timeago (English)", () => {
  const now = new Date("2026-01-10T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("buckets", () => {
    expect(timeagoFormat(ago(10_000), now)).toBe("a moment ago");
    expect(timeagoFormat(ago(60_000), now)).toBe("a minute ago");
    expect(timeagoFormat(ago(10 * 60_000), now)).toBe("10 minutes ago");
    expect(timeagoFormat(ago(60 * 60_000), now)).toBe("about an hour ago");
    expect(timeagoFormat(ago(5 * 3600_000), now)).toBe("5 hours ago");
    expect(timeagoFormat(ago(30 * 3600_000), now)).toBe("a day ago");
    expect(timeagoFormat(ago(3 * 86400_000), now)).toBe("3 days ago");
  });
});

describe("order_card.dart date formatting", () => {
  it("today / yesterday / weekday / full date", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    expect(formatDateTime(new Date(2026, 0, 15, 9, 5), now)).toBe("Today at 9:05 AM");
    expect(formatDateTime(new Date(2026, 0, 14, 21, 30), now)).toBe("Yesterday at 9:30 PM");
    expect(formatDateTime(new Date(2026, 0, 12, 0, 0), now)).toBe("Monday at 12:00 AM");
    expect(formatDateTime(new Date(2025, 11, 1, 13, 0), now)).toBe("Dec 1, 2025 at 1:00 PM");
  });
});

describe("signup password rules", () => {
  it("validates in Dart order", () => {
    expect(validateNewPassword("", "E", "R")).toBe("E");
    expect(validateNewPassword("a b", "E", "R")).toBe("Password cannot contain spaces");
    expect(validateNewPassword("Password123", "E", "R")).toBe("This password is too common");
    expect(validateNewPassword("Abcdefg1", "E", "R")).toBe("R");
    expect(validateNewPassword("aaaaB1@x", "E", "R")).toBe("Password contains too many repeated characters");
    expect(validateNewPassword("Abcdef1@", "E", "R")).toBeNull();
  });
  it("strength", () => {
    expect(passwordStrength("")).toBe("Empty");
    expect(passwordStrength("Abcdef1@")).toBe("Strong");
  });
});
