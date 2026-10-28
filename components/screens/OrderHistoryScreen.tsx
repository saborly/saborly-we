"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, fmt2 } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { Order, OrderStatus, PaymentMethod } from "@/lib/models";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { loadMoreOrders, loadOrders, useOrders } from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";

const BADGES: Record<OrderStatus, [string, string, string, string]> = {
  pending: ["#FFF3CD", "#B8860B", "schedule_rounded", "Pending"],
  confirmed: ["#D1E7FF", "#0052CC", "check_circle_rounded", "Confirmed"],
  preparing: ["#E8DAFF", "#5F2EEA", "restaurant_rounded", "Preparing"],
  ready: ["#BFEBE5", "#00594F", "done_all_rounded", "Ready"],
  pickup: ["#BFDBFE", "#1E40AF", "shopping_bag_rounded", "Pickup"],
  driverpickup: ["#BFDBFE", "#2893AD", "shopping_bag_rounded", "Drive Pickup"],
  shop: ["#D1FAE5", "#065F46", "storefront_rounded", "Shop"],
  outForDelivery: ["#FFDDB3", "#92400E", "local_shipping_rounded", "On the Way"],
  delivered: ["#D1FAE5", "#065F46", "check_circle_rounded", "Delivered"],
  cancelled: ["#FEE2E2", "#991B1B", "cancel_rounded", "Cancelled"],
  refunded: ["#E5E7EB", "#374151", "money_off_rounded", "Refunded"],
};

const timeStr = (d: Date) => {
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** order_card.dart _formatDateTime */
export function formatDateTime(date: Date, now = new Date()): string {
  const ymd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = ymd(now), yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime(), chk = ymd(date);
  const ts = timeStr(date);
  if (chk === today) return `Today at ${ts}`;
  if (chk === yesterday) return `Yesterday at ${ts}`;
  if (Math.trunc((now.getTime() - date.getTime()) / 86_400_000) < 7) return `${DAY[date.getDay()]} at ${ts}`;
  return `${MON[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${ts}`;
}
const payIcon = (m: PaymentMethod) => (m === "cashOnDelivery" || m === "shop" ? "payments_rounded" : m === "paypal" ? "account_balance_wallet_rounded" : "credit_card_rounded");
const payText = (m: PaymentMethod) => (m === "cashOnDelivery" || m === "shop" ? "Cash" : m === "card" ? "Card" : m === "paypal" ? "PayPal" : "Stripe");

function Badge({ status }: { status: OrderStatus }) {
  const u = useScreen();
  const [bg, fg, icon, text] = BADGES[status];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: `${u.h(8)}px ${u.w(12)}px`, background: bg, borderRadius: u.r(10) }}>
      <Icon name={icon} size={u.sp(16)} color={fg} /><span style={{ width: u.w(6) }} />
      <span style={{ fontSize: u.sp(13), fontWeight: 700, color: fg }}>{text}</span>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const u = useScreen();
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ padding: u.r(8), background: "#fff", borderRadius: u.r(10), display: "flex" }}><Icon name={icon} size={u.sp(18)} color={C.primary} /></div>
      <span style={{ width: u.w(12) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u.sp(12), color: C.textLight, fontWeight: 500 }}>{label}</div>
        <div style={{ height: u.h(2) }} />
        <div style={{ fontSize: u.sp(14), color: C.textDark, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const u = useScreen();
  const router = useRouter();
  const open = () => router.push(ROUTES.orderStatus(order.id));
  const n = order.items.length;
  return (
    <div className="order-card-in" style={{ animationDuration: `${300 + index * 50}ms`, background: "#fff", borderRadius: u.r(20), boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
      <div onClick={open} style={{ padding: u.w(20), cursor: "pointer", borderRadius: u.r(20) }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ padding: u.r(12), background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.15)}, ${withOpacity(C.primary, 0.08)})`, borderRadius: u.r(14), display: "flex" }}><Icon name="receipt_long_rounded" size={u.sp(24)} color={C.primary} /></div>
          <span style={{ width: u.w(14) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: u.sp(17), fontWeight: 800, color: C.textDark, letterSpacing: -0.3 }}>Order #{order.id.substring(0, 8).toUpperCase()}</div>
            <div style={{ height: u.h(4) }} />
            <div style={{ display: "flex", alignItems: "center" }}>
              <Icon name="access_time_rounded" size={u.sp(14)} color={C.textLight} /><span style={{ width: u.w(4) }} />
              <span style={{ fontSize: u.sp(13), color: C.textLight, fontWeight: 500 }}>{formatDateTime(order.createdAt)}</span>
            </div>
          </div>
          <Badge status={order.status} />
        </div>
        <div style={{ height: u.h(20) }} />
        <div style={{ padding: u.w(16), background: "#F8F9FA", borderRadius: u.r(14) }}>
          <InfoRow icon="shopping_bag_outlined" label="Items" value={`${n} ${n === 1 ? "item" : "items"}`} />
          <div style={{ height: u.h(12) }} />
          <InfoRow icon="store_outlined" label="Branch" value={order.branchName ?? "Main Store"} />
          <div style={{ height: u.h(12) }} />
          <InfoRow icon={order.deliveryType === "delivery" ? "delivery_dining_rounded" : "shopping_bag_outlined"} label="Type" value={order.deliveryType === "delivery" ? "Delivery" : "Pickup"} />
          <div style={{ height: u.h(12) }} />
          <InfoRow icon={payIcon(order.paymentMethod)} label="Payment" value={payText(order.paymentMethod)} />
        </div>
        <div style={{ height: u.h(20) }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: u.sp(13), fontWeight: 500, color: C.textLight }}>Total Amount</div>
            <div style={{ height: u.h(4) }} />
            <div style={{ fontSize: u.sp(24), fontWeight: 900, color: C.primary, letterSpacing: -0.5 }}>${fmt2(order.total)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div onClick={(e) => { e.stopPropagation(); open(); }} style={{ border: `2px solid ${C.primary}`, borderRadius: u.r(12), padding: `${u.h(12)}px ${u.w(16)}px`, display: "flex", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: u.sp(14), fontWeight: 700, color: C.primary }}>Details</span><span style={{ width: u.w(4) }} />
              <Icon name="arrow_forward_rounded" size={u.sp(16)} color={C.primary} />
            </div>
            {order.status === "delivered" && (
              <>
                <span style={{ width: u.w(10) }} />
                <div onClick={(e) => { e.stopPropagation(); router.push(ROUTES.menu); }} style={{ background: `linear-gradient(90deg, ${C.primary}, ${withOpacity(C.primary, 0.8)})`, borderRadius: u.r(12), boxShadow: `0 4px 8px ${withOpacity(C.primary, 0.3)}`, padding: `${u.h(12)}px ${u.w(16)}px`, display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <Icon name="repeat_rounded" size={u.sp(16)} color="#fff" /><span style={{ width: u.w(6) }} />
                  <span style={{ fontSize: u.sp(14), fontWeight: 700, color: "#fff" }}>Reorder</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Port of lib/features/menu/screens/order_history.dart (+ order_history/widgets/*)
export function OrderHistoryScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const s = useOrders();
  const scroller = useRef<HTMLDivElement>(null);
  const isWeb = u.width > 600;

  useEffect(() => { void loadOrders(50); }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (el && el.scrollTop >= el.scrollHeight - el.clientHeight - 100) void loadMoreOrders();
  };

  const center = (children: React.ReactNode) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: u.w(32), boxSizing: "border-box", textAlign: "center" }}>{children}</div>
  );
  let body: React.ReactNode;
  if (s.isLoading && s.orders.length === 0) {
    body = center(<>
      <div style={{ padding: u.r(24), background: "#fff", borderRadius: "50%", boxShadow: `0 0 20px 5px ${withOpacity(C.primary, 0.1)}`, display: "flex" }}><Spinner size={40} stroke={3} /></div>
      <div style={{ height: u.h(32) }} />
      <div style={{ fontSize: u.sp(16), color: C.textDark, fontWeight: 500 }}>{t("loadingYourOrders")}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ fontSize: u.sp(13), color: C.textLight }}>Please wait a moment...</div>
    </>);
  } else if (s.error != null && s.orders.length === 0) {
    body = center(<>
      <div style={{ padding: u.r(32), background: `linear-gradient(90deg, ${withOpacity(C.error, 0.1)}, ${withOpacity(C.error, 0.05)})`, borderRadius: u.r(24), display: "flex" }}><Icon name="error_outline_rounded" size={u.sp(72)} color={C.error} /></div>
      <div style={{ height: u.h(28) }} />
      <div style={{ fontSize: u.sp(22), fontWeight: 800, color: C.textDark }}>{t("oopsSomethingWrong")}</div>
      <div style={{ height: u.h(12) }} />
      <div style={{ padding: `${u.h(12)}px ${u.w(20)}px`, background: "#F5F5F5", borderRadius: u.r(12), fontSize: u.sp(14), color: C.textLight, lineHeight: 1.5 }}>{s.error}</div>
      <div style={{ height: u.h(32) }} />
      <MButton onClick={() => void loadOrders(50)} padding={[u.h(16), u.w(40)]} radius={u.r(14)} fontSize={u.sp(15)} fontWeight={700}>
        <Icon name="refresh_rounded" size={24} color="#fff" /><span style={{ width: 8 }} /><span>{t("retry")}</span>
      </MButton>
    </>);
  } else if (s.orders.length === 0) {
    body = center(<>
      <div style={{ padding: u.r(40), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.1)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: u.r(30), display: "flex" }}><Icon name="receipt_long_rounded" size={u.sp(100)} color={withOpacity(C.primary, 0.6)} /></div>
      <div style={{ height: u.h(36) }} />
      <div style={{ fontSize: u.sp(26), fontWeight: 800, color: C.textDark, letterSpacing: -0.5 }}>{t("noOrdersYet")}</div>
      <div style={{ height: u.h(16) }} />
      <div style={{ fontSize: u.sp(15), color: C.textLight, lineHeight: 1.6, fontWeight: 500 }}>Start your culinary journey today!<br />Your order history will appear here</div>
      <div style={{ height: u.h(48) }} />
      <MButton onClick={() => router.push("/")} padding={[u.h(18), u.w(48)]} radius={u.r(14)} fontSize={u.sp(16)} fontWeight={700} letterSpacing={0.3}>
        <Icon name="restaurant_menu_rounded" size={u.sp(20)} color="#fff" /><span style={{ width: u.w(10) }} /><span>{t("startOrdering")}</span>
      </MButton>
    </>);
  } else {
    body = (
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center" }}>
        <div ref={scroller} onScroll={onScroll} style={{ width: "100%", maxWidth: isWeb ? 920 : undefined, overflowY: "auto", padding: `${u.h(24)}px ${isWeb ? u.w(48) : u.w(16)}px`, boxSizing: "border-box" }}>
          {s.orders.map((o, i) => (
            <div key={o.id} style={{ marginBottom: u.h(16) }}><OrderCard order={o} index={i} /></div>
          ))}
          {s.hasMoreOrders && (
            <div style={{ margin: `${u.h(24)}px 0`, padding: u.r(20), background: "#fff", borderRadius: u.r(16), boxShadow: "0 2px 10px rgba(0,0,0,.04)", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Spinner size={20} stroke={2.5} /><span style={{ width: u.w(12) }} />
              <span style={{ fontSize: u.sp(14), color: C.textLight, fontWeight: 500 }}>Loading more orders...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "#F5F7FA", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", height: 57, boxSizing: "border-box", background: "#fff", borderBottom: "1px solid #EEEEEE", display: "flex", alignItems: "center", position: "relative" }}>
        <button aria-label="Back" onClick={() => router.push(ROUTES.profile)} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: u.r(8), background: withOpacity(C.primary, 0.1), borderRadius: u.r(10), display: "flex" }}><Icon name="arrow_back_ios_new" size={u.sp(18)} color={C.primary} /></div>
        </button>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontSize: u.sp(20), fontWeight: 800, color: C.textDark, letterSpacing: -0.5 }}>{t("orderHistory")}</div>
      </div>
      {body}
    </div>
  );
}
