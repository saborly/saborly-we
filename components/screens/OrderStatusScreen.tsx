"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, fmt2 } from "@/components/ui/primitives";
import { CustomButton } from "@/components/ui/forms";
import { MButton } from "@/components/ui/MButton";
import { showSnack } from "@/components/ui/Toast";
import { Order } from "@/lib/models";
import {
  calculateTimeRemaining, formatOrderDate, getPaymentMethodText, getPaymentStatusText, getStatusColor, getStatusIcon, isStatusCompleted,
} from "@/lib/orderStatus";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { loadOrder, orderStore, useOrders } from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";

const card = (pad: number): React.CSSProperties => ({ padding: pad, background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,.06)", boxSizing: "border-box" });

// Port of lib/features/menu/screens/order_status.dart (+ order_status/widgets/*). Not inside MainLayout (top-level route).
export function OrderStatusScreen({ orderId }: { orderId: string }) {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const orders = useOrders();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (orderId) void loadOrder(orderId);
    const poll = setInterval(() => {
      const o = orderStore.state.currentOrder;
      if (o && (o.status === "delivered" || o.status === "cancelled" || o.status === "refunded")) { clearInterval(poll); clearInterval(clock); return; }
      void loadOrder(orderId, true).catch(() => {});
    }, 5000);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [orderId]);

  const sw = u.width, isMobile = sw < 600, isDesktop = sw >= 1200, isTablet = sw >= 600 && sw < 1200;
  const contentMax = sw >= 1400 ? 1400 : isDesktop ? 1200 : undefined;
  const hpad = sw >= 1400 ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const vpad = isDesktop ? 40 : isTablet ? 32 : 20;

  let body: React.ReactNode;
  if (orders.isLoading && orders.currentOrder == null) body = <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>;
  else if (orders.error != null || orders.currentOrder == null) {
    body = (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 500, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
          <Icon name="error_outline_rounded" size={80} color={C.error} />
          <div style={{ height: 24 }} />
          <div style={{ textAlign: "center", fontSize: 18, color: C.textDark, fontWeight: 500 }}>{orders.error ?? t("orderNotFound")}</div>
          <div style={{ height: 32 }} />
          <div style={{ width: 200 }}><CustomButton text={t("goBack")} onPressed={() => router.push(ROUTES.home)} /></div>
        </div>
      </div>
    );
  } else {
    const order = orders.currentOrder;
    const common = { order, isDesktop, isTablet };
    body = (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div key={`${order.id}_${order.status}_${order.updatedAt.getTime()}`} style={{ width: "100%", maxWidth: contentMax, padding: `${vpad}px ${hpad}px`, boxSizing: "border-box" }}>
          {isDesktop ? (
            <>
              <Header {...common} />
              <div style={{ height: 40 }} />
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 3, minWidth: 0 }}>
                  <DeliveryTime {...common} now={now} />
                  <div style={{ height: 32 }} />
                  <Progress {...common} />
                </div>
                <span style={{ width: 40, flex: "none" }} />
                <div style={{ flex: 2, minWidth: 0 }}>
                  <RestaurantInfo {...common} /><div style={{ height: 24 }} />
                  <PaymentInfo {...common} /><div style={{ height: 24 }} />
                  <Details {...common} /><div style={{ height: 32 }} />
                  <CustomButton text={t("home")} onPressed={() => router.push(ROUTES.home)} />
                </div>
              </div>
              <div style={{ height: 40 }} />
            </>
          ) : (
            <>
              <Header {...common} /><div style={{ height: 24 }} />
              <DeliveryTime {...common} now={now} /><div style={{ height: 24 }} />
              <Progress {...common} /><div style={{ height: 24 }} />
              <RestaurantInfo {...common} /><div style={{ height: 24 }} />
              <PaymentInfo {...common} /><div style={{ height: 24 }} />
              <Details {...common} />
              <div style={{ height: isMobile ? 100 : 40 }} />
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, background: C.background }}>
      {body}
      {isMobile && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 16, background: "#fff", boxShadow: "0 -4px 16px rgba(0,0,0,.08)", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <CustomButton text={t("home")} onPressed={() => router.push(ROUTES.home)} />
        </div>
      )}
    </div>
  );
}

type P = { order: Order; isDesktop: boolean; isTablet: boolean };

function Header({ order, isDesktop, isTablet }: P) {
  const { language } = useLanguage();
  const color = getStatusColor(order.status);
  return (
    <div style={card(isDesktop ? 32 : isTablet ? 28 : 24)}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ padding: 12, background: withOpacity(color, 0.1), borderRadius: "50%", display: "flex" }}><Icon name={getStatusIcon(order.status)} size={isDesktop ? 32 : 28} color={color} /></div>
        <span style={{ width: 16 }} />
        <span style={{ fontSize: isDesktop ? 28 : isTablet ? 24 : 20, fontWeight: 700, color: C.primary, letterSpacing: -0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Order #{order.id.toUpperCase()}</span>
      </div>
      <div style={{ height: 12 }} />
      <div style={{ textAlign: "center", fontSize: isDesktop ? 16 : 14, color: C.textLight, fontWeight: 500 }}>{formatOrderDate(order.createdAt, language)}</div>
    </div>
  );
}

function DeliveryTime({ order, isDesktop, isTablet, now }: P & { now: Date }) {
  const { t } = useLanguage();
  const router = useRouter();
  const isPickup = order.deliveryType === "pickup";
  const remaining = calculateTimeRemaining(order, now);
  const delivered = order.status === "delivered", cancelled = order.status === "cancelled", outForDelivery = order.status === "outForDelivery";
  const pickedUp = (order.status === "pickup" || order.status === "driverpickup" || order.status === "shop") && isPickup;
  const readyForPickup = isPickup && order.status === "ready";
  const hasDriver = !isPickup && (order.status === "driverpickup" || order.status === "pickup" || outForDelivery);
  const [g1, g2] = delivered ? ["#4CAF50", "#388E3C"] : cancelled ? ["#C62828", "#B71C1C"] : pickedUp ? ["#388E3C", "#2E7D32"] : outForDelivery ? ["#303F9F", "#1A237E"] : [C.primary, C.primaryDark];
  const shadowColor = delivered ? "#4CAF50" : cancelled ? "#C62828" : outForDelivery ? "#303F9F" : C.primary;
  const title = delivered ? t("delivered") : cancelled ? t("cancelled") : pickedUp ? t("pickedUp") : outForDelivery ? t("outForDelivery") : readyForPickup ? t("readyForPickup") : isPickup ? t("readyIn") : t("estimatedDelivery");
  const big = delivered || pickedUp ? "✓" : cancelled ? "✗" : outForDelivery ? "🚚" : `${remaining} min`;
  const pillIcon = delivered || pickedUp ? "check_circle_rounded" : cancelled ? "cancel_rounded" : outForDelivery ? "local_shipping_rounded" : isPickup ? "shopping_bag_rounded" : "schedule_rounded";
  const pillText = delivered ? t("orderCompleted") : cancelled ? t("orderCancelled") : outForDelivery ? t("driverOnTheWay") : isPickup ? t("readyIn") : t("getYourOrder");
  return (
    <div style={{ padding: isDesktop ? 48 : isTablet ? 40 : 32, background: `linear-gradient(135deg, ${g1}, ${g2})`, borderRadius: 24, boxShadow: `0 8px 24px ${withOpacity(shadowColor, 0.4)}`, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
      <div style={{ fontSize: isDesktop ? 18 : 16, color: "rgba(255,255,255,.95)", fontWeight: 500, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ height: 16 }} />
      <div style={{ fontSize: isDesktop ? 64 : isTablet ? 56 : 48, fontWeight: 800, color: "#fff", letterSpacing: -2, lineHeight: 1 }}>{big}</div>
      <div style={{ height: 20 }} />
      <div style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", background: "rgba(255,255,255,.2)", borderRadius: 30, border: "1px solid rgba(255,255,255,.3)" }}>
        <Icon name={pillIcon} size={isDesktop ? 20 : 18} color="#fff" /><span style={{ width: 8 }} />
        <span style={{ fontSize: isDesktop ? 15 : 14, fontWeight: 500, color: "#fff", letterSpacing: 0.3 }}>{pillText}</span>
      </div>
      {hasDriver && (
        <>
          <div style={{ height: 16 }} />
          <div style={{ width: "100%", display: "flex" }}>
            <MButton variant="outlined" fullWidth onClick={() => router.push(ROUTES.orderTracking(order.id))} padding={[14, 24]} radius={30} border="1.4px solid rgba(255,255,255,.6)" fg="#fff" fontSize={15} fontWeight={700}>
              <Icon name="map_rounded" size={24} color="#fff" /><span style={{ width: 8 }} /><span>{t("trackOrder")}</span>
            </MButton>
          </div>
        </>
      )}
    </div>
  );
}

function Progress({ order, isDesktop, isTablet }: P) {
  const { t } = useLanguage();
  const isPickup = order.deliveryType === "pickup", cancelled = order.status === "cancelled";
  const done = (s: Parameters<typeof isStatusCompleted>[1]) => isStatusCompleted(order.status, s);
  const step = (title: string, color: string, completed: boolean, o: { first?: boolean; last?: boolean } = {}) => (
    <div key={title} style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {!o.first && <div style={{ width: 3, height: 40, background: completed ? `linear-gradient(180deg, ${withOpacity(color, 0.6)}, ${color})` : C.border }} />}
        <div style={{ width: 32, height: 32, boxSizing: "border-box", borderRadius: "50%", border: `2.5px solid ${completed ? "transparent" : C.border}`, background: completed ? `linear-gradient(90deg, ${withOpacity(color, 0.8)}, ${color})` : "#fff", boxShadow: completed ? `0 4px 12px ${withOpacity(color, 0.3)}` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {completed && <Icon name="check_rounded" size={18} color="#fff" />}
        </div>
        {!o.last && <div style={{ width: 3, height: 40, background: completed ? `linear-gradient(180deg, ${color}, ${withOpacity(color, 0.6)})` : C.border }} />}
      </div>
      <span style={{ width: 24, flex: "none" }} />
      <span style={{ flex: 1, fontSize: isDesktop ? 16 : 15, fontWeight: completed ? 600 : 500, color: completed ? C.textDark : C.textLight, letterSpacing: 0.2 }}>{title}</span>
    </div>
  );
  return (
    <div style={card(isDesktop ? 36 : isTablet ? 32 : 28)}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: 8, background: cancelled ? "rgba(198,40,40,.1)" : withOpacity(C.primary, 0.1), borderRadius: 8, display: "flex" }}>
          <Icon name={cancelled ? "cancel_rounded" : isPickup ? "shopping_bag_rounded" : "local_shipping_rounded"} size={20} color={cancelled ? "#C62828" : C.primary} />
        </div>
        <span style={{ width: 12 }} />
        <span style={{ fontSize: isDesktop ? 22 : isTablet ? 20 : 18, fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("orderProgress")}</span>
      </div>
      <div style={{ height: isDesktop ? 36 : 32 }} />
      {cancelled ? (
        <div style={{ padding: 20, background: "rgba(198,40,40,.1)", borderRadius: 12, border: "1.5px solid rgba(198,40,40,.3)", display: "flex", alignItems: "center" }}>
          <div style={{ padding: 8, background: "#C62828", borderRadius: "50%", display: "flex" }}><Icon name="cancel_rounded" size={24} color="#fff" /></div>
          <span style={{ width: 16 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: "#C62828" }}>{t("orderCancelled")}</div>
            <div style={{ height: 4 }} />
            <div style={{ fontSize: 14, color: C.textLight, lineHeight: 1.4 }}>{t("orderCancelledMessage")}</div>
          </div>
        </div>
      ) : isPickup ? (
        <>
          {step(t("orderPlaced"), "#FF6F00", done("pending"), { first: true })}
          {step(t("orderConfirmed"), "#1976D2", done("confirmed"))}
          {step(t("preparing"), "#7B1FA2", done("preparing"))}
          {step(t("readyForPickup"), "#0097A7", done("ready"))}
          {step(t("pickedUp"), "#388E3C", order.status === "delivered" || order.status === "shop" || order.status === "pickup", { last: true })}
        </>
      ) : (
        <>
          {step(t("orderPlaced"), "#FF6F00", done("pending"), { first: true })}
          {step(t("orderConfirmed"), "#1976D2", done("confirmed"))}
          {step(t("preparing"), "#7B1FA2", done("preparing"))}
          {step(t("ready"), "#0097A7", done("ready"))}
          {step(t("driverPickup"), "#FF6F00", done("pickup") || done("driverpickup"))}
          {step(t("outForDelivery"), "#303F9F", done("outForDelivery"))}
          {step(t("delivered"), "#2E7D32", order.status === "delivered", { last: true })}
        </>
      )}
    </div>
  );
}

function RestaurantInfo({ order, isDesktop, isTablet }: P) {
  const { t } = useLanguage();
  const phone = "+34932112072";
  return (
    <div style={card(isDesktop ? 24 : isTablet ? 22 : 20)}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ width: isDesktop ? 80 : 70, height: isDesktop ? 80 : 70, borderRadius: 16, background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.15)}, ${withOpacity(C.primaryDark, 0.15)})`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name="restaurant_rounded" size={isDesktop ? 36 : 32} color={C.primary} />
        </div>
        <span style={{ width: 16 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isDesktop ? 18 : 17, fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{order.branchName ?? t("boshundhoraRA")}</div>
          <div style={{ height: 8 }} />
          <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("restaurantAddress")}</div>
        </div>
      </div>
      <div style={{ height: 16 }} />
      <MButton fullWidth onClick={() => {
        try { window.location.href = `tel:${phone}`; }
        catch (e) { showSnack(t("callErrorGeneric").replace("{error}", String(e)), { bg: C.error }); }
      }} padding={[14, 20]} radius={12} fontSize={15} fontWeight={600} fontFamily="inherit">
        <Icon name="phone_rounded" size={20} color="#fff" /><span style={{ width: 8 }} /><span>{t("callRestaurant")}</span>
      </MButton>
    </div>
  );
}

function InfoRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ paddingBottom: 12, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 15, color: C.textLight, fontWeight: bold ? 600 : 500 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: bold ? 700 : 600, color: bold ? C.primary : C.textDark }}>{value}</span>
    </div>
  );
}
function CardTitle({ icon, text, size }: { icon: string; text: string; size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ padding: 8, background: withOpacity(C.primary, 0.1), borderRadius: 8, display: "flex" }}><Icon name={icon} size={20} color={C.primary} /></div>
      <span style={{ width: 12 }} />
      <span style={{ fontSize: size, fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{text}</span>
    </div>
  );
}

function PaymentInfo({ order, isDesktop, isTablet }: P) {
  const { t, language } = useLanguage();
  const cancelled = order.status === "cancelled";
  return (
    <div style={card(isDesktop ? 24 : isTablet ? 22 : 20)}>
      <CardTitle icon="payment_rounded" text={t("paymentInfo")} size={isDesktop ? 18 : 17} />
      <div style={{ height: 20 }} />
      <InfoRow label={t("paymentMethod")} value={getPaymentMethodText(order.paymentMethod, language)} />
      <div style={{ height: 0 }} />
      <InfoRow label={t("paymentStatus")} value={getPaymentStatusText(order.status === "delivered" ? "paid" : cancelled ? "refunded" : order.paymentStatus, language)} />
      {cancelled && (
        <>
          <div style={{ height: 16 }} />
          <div style={{ padding: 12, background: "#FFF3E0", borderRadius: 8, border: "1px solid rgba(255,111,0,.3)", display: "flex", alignItems: "center" }}>
            <Icon name="info_outline_rounded" size={20} color="#FF6F00" /><span style={{ width: 12 }} />
            <span style={{ flex: 1, fontSize: 13, color: "#E65100", fontWeight: 500 }}>{t("refundProcessing")}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Details({ order, isDesktop, isTablet }: P) {
  const { t } = useLanguage();
  return (
    <div style={card(isDesktop ? 24 : isTablet ? 22 : 20)}>
      <CardTitle icon="receipt_rounded" text={t("orderDetails")} size={isDesktop ? 18 : 17} />
      <div style={{ height: 20 }} />
      {order.items.map((ci) => (
        <div key={ci.id} style={{ paddingBottom: 16, display: "flex", alignItems: "center" }}>
          <div style={{ padding: 3, border: `1.5px solid ${ci.foodItem.isVeg ? "#4CAF50" : "#F44336"}`, borderRadius: 4, display: "flex" }}><Icon name="circle" size={8} color={ci.foodItem.isVeg ? "#4CAF50" : "#F44336"} /></div>
          <span style={{ width: 12 }} />
          <span style={{ flex: 1, fontSize: 15, color: C.textDark, fontWeight: 500 }}>{ci.quantity}x {ci.foodItem.name}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark }}>{t("currency")}{fmt2(ci.totalPrice)}</span>
        </div>
      ))}
      <div style={{ height: 20 }} />
      <div style={{ height: 1, background: C.divider }} />
      <div style={{ height: 16 }} />
      <InfoRow label={t("subtotal")} value={`${t("currency")}${fmt2(order.subtotal)}`} />
      {order.deliveryFee > 0 && <InfoRow label={t("deliveryFee")} value={`${t("currency")}${fmt2(order.deliveryFee)}`} />}
      {order.tax > 0 && <InfoRow label={t("tax")} value={`${t("currency")}${fmt2(order.tax)}`} />}
      <div style={{ height: 16 }} />
      <div style={{ height: 2, background: C.divider }} />
      <div style={{ height: 16 }} />
      <InfoRow label={t("total")} value={`${t("currency")}${fmt2(order.total)}`} bold />
    </div>
  );
}
