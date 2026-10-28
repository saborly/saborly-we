"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, usePopup } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { AlertDialogBox, DialogTextButton } from "@/components/ui/AlertDialog";
import { showSnack } from "@/components/ui/Toast";
import { timeagoFormat } from "@/lib/timeago";
import { AppNotification } from "@/lib/offerModels";
import { ROUTES, setExtra } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import {
  addNotification, clearAllNotifications, deleteNotification, loadNotifications, markAllNotificationsAsRead, markNotificationAsRead, useNotifications,
} from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";

const RED_400 = "#EF5350", RED_600 = "#E53935", RED_700 = "#D32F2F", GREEN_600 = "#43A047", GREEN_700 = "#388E3C";

function notificationIcon(type: string): string {
  switch (type) {
    case "order_update": case "order_status": return "shopping_bag_rounded";
    case "promotion": case "offer": return "local_offer_rounded";
    case "menu_update": case "new_item": return "restaurant_menu_rounded";
    case "cart": return "shopping_cart_rounded";
    case "profile": case "account": return "person_rounded";
    default: return "notifications_rounded";
  }
}
function notificationColor(type: string): string {
  switch (type) {
    case "order_update": case "order_status": return "#2196F3";
    case "promotion": case "offer": return "#FF9800";
    case "menu_update": case "new_item": return "#4CAF50";
    case "cart": return C.primary;
    default: return "#9E9E9E";
  }
}

function SnackRow({ icon, text, sp }: { icon: string; text: string; sp: (n: number) => number }) {
  return (
    <span style={{ display: "flex", alignItems: "center" }}>
      <Icon name={icon} size={sp(20)} color="#fff" /><span style={{ width: 12 }} />
      <span style={{ flex: 1, fontSize: sp(14) }}>{text}</span>
    </span>
  );
}

function NotificationCard({ n, onTap }: { n: AppNotification; onTap: (n: AppNotification) => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const color = notificationColor(n.type);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const el = useRef<HTMLDivElement>(null);

  const dismiss = () => {
    deleteNotification(n.id);
    showSnack(<SnackRow icon="delete_outline_rounded" text={t("notificationDeleted")} sp={u.sp} />, {
      bg: RED_600, radius: `${u.r(12)}px`, action: { label: t("undo"), onClick: () => addNotification(n) },
    });
  };
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, id: e.pointerId, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const delta = Math.min(0, e.clientX - d.x); // endToStart only
    if (Math.abs(e.clientX - d.x) > 6) { d.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    if (d.moved) setDx(delta);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const w = el.current?.offsetWidth ?? 300;
    if (d.moved && -dx > w * 0.4) { setLeaving(true); setDx(-w); setTimeout(dismiss, 200); }
    else { setDx(0); }
  };

  return (
    <div style={{ position: "relative", marginBottom: u.h(12) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: u.r(16), background: `linear-gradient(90deg, ${RED_400}, ${RED_600})`, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", paddingRight: u.w(24), boxSizing: "border-box" }}>
        <Icon name="delete_rounded" size={u.sp(28)} color="#fff" />
        <div style={{ height: u.h(4) }} />
        <span style={{ color: "#fff", fontSize: u.sp(12), fontWeight: 500 }}>Delete</span>
      </div>
      <div ref={el} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={() => { if (!drag.current && dx === 0) onTap(n); }}
        style={{
          position: "relative", transform: `translateX(${dx}px)`, transition: drag.current ? "none" : "transform 200ms ease-out", opacity: leaving ? 0.3 : 1, touchAction: "pan-y", cursor: "pointer",
          background: "#fff", borderRadius: u.r(16), border: `2px solid ${n.isRead ? "transparent" : withOpacity(C.primary, 0.2)}`, boxSizing: "border-box",
          boxShadow: n.isRead ? "0 2px 8px rgba(0,0,0,.03)" : `0 2px 12px ${withOpacity(C.primary, 0.08)}`,
        }}>
        <div style={{ padding: u.w(16), display: "flex", alignItems: "flex-start" }}>
          <div style={{ padding: u.w(14), background: `linear-gradient(135deg, ${withOpacity(color, 0.2)}, ${withOpacity(color, 0.1)})`, borderRadius: u.r(14), boxShadow: `0 2px 8px ${withOpacity(color, 0.2)}`, display: "flex", flex: "none" }}>
            <Icon name={notificationIcon(n.type)} size={u.sp(26)} color={color} />
          </div>
          <span style={{ width: u.w(16), flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: u.sp(16), fontWeight: 700, color: C.textDark, letterSpacing: -0.3, lineHeight: 1.3 }}>{n.title}</span>
              {!n.isRead && <span style={{ width: u.w(10), height: u.h(10), borderRadius: "50%", background: `linear-gradient(90deg, ${C.primary}, ${withOpacity(C.primary, 0.7)})`, boxShadow: `0 0 4px 1px ${withOpacity(C.primary, 0.5)}`, flex: "none" }} />}
            </div>
            <div style={{ height: u.h(8) }} />
            <div style={{ fontSize: u.sp(14), color: C.textMedium, lineHeight: 1.5, letterSpacing: -0.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div>
            <div style={{ height: u.h(12) }} />
            <div style={{ display: "flex", alignItems: "center" }}>
              <Icon name="access_time_rounded" size={u.sp(14)} color={C.textLight} /><span style={{ width: u.w(6) }} />
              <span style={{ fontSize: u.sp(13), color: C.textLight, fontWeight: 500 }}>{timeagoFormat(new Date(n.timestamp))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClearAllDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <AlertDialogBox open={open} onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ padding: u.w(10), background: "#FFEBEE", borderRadius: u.r(12), display: "flex" }}><Icon name="warning_rounded" size={u.sp(24)} color={RED_700} /></div>
          <span style={{ width: u.w(12) }} />
          <span style={{ flex: 1, fontSize: u.sp(18), fontWeight: 700 }}>{t("clearAllNotifications")}</span>
        </div>
      }
      content={<div style={{ fontSize: u.sp(15), color: C.textMedium, lineHeight: 1.5 }}>{t("areYouSureYouWantToClearAllNotifications")}</div>}
      actions={
        <>
          <MButton variant="text" onClick={onClose} padding={[u.h(12), u.w(20)]} fg={C.textMedium} fontSize={u.sp(15)} fontWeight={600}>{t("cancel")}</MButton>
          <MButton bg={RED_600} padding={[u.h(12), u.w(20)]} radius={u.r(10)} fontSize={u.sp(15)} fontWeight={600} onClick={() => {
            clearAllNotifications(); onClose();
            showSnack(<SnackRow icon="check_circle_rounded" text={t("allNotificationsCleared")} sp={u.sp} />, { bg: GREEN_600, radius: `${u.r(12)}px` });
          }}>{t("clear")}</MButton>
        </>
      } />
  );
}
void DialogTextButton;

function AppBarMenu({ onClearAll }: { onClearAll: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const pop = usePopup();
  const item = (icon: string, label: string, tint: string, iconColor: string, labelColor: string | undefined, onClick: () => void) => (
    <div onClick={() => { pop.setOpen(false); onClick(); }} style={{ height: 48, padding: "0 16px", display: "flex", alignItems: "center", cursor: "pointer", minWidth: 112 }}>
      <div style={{ padding: u.w(8), background: withOpacity(tint, 0.1), borderRadius: u.r(8), display: "flex" }}><Icon name={icon} size={u.sp(18)} color={iconColor} /></div>
      <span style={{ width: u.w(12) }} />
      <span style={{ fontSize: u.sp(14), fontWeight: 500, color: labelColor }}>{label}</span>
    </div>
  );
  return (
    <div ref={pop.ref} style={{ position: "relative", marginRight: u.w(8) }}>
      <button aria-label="menu" onClick={() => pop.setOpen(!pop.open)} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: u.w(8), background: withOpacity(C.primary, 0.1), borderRadius: u.r(10), display: "flex" }}><Icon name="more_vert_rounded" size={u.sp(20)} color={C.primary} /></div>
      </button>
      {pop.open && (
        <div style={{ position: "absolute", top: 50, right: 0, background: "#fff", borderRadius: u.r(12), boxShadow: "0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)", padding: "8px 0", zIndex: 50, whiteSpace: "nowrap" }}>
          {item("done_all_rounded", t("markAllAsRead"), "#4CAF50", GREEN_700, undefined, () => {
            markAllNotificationsAsRead();
            showSnack(<SnackRow icon="check_circle_rounded" text={t("allNotificationsMarkedAsRead")} sp={u.sp} />, { bg: GREEN_600, radius: `${u.r(12)}px` });
          })}
          {item("delete_sweep_rounded", t("clearAll"), "#F44336", RED_700, RED_700, onClearAll)}
        </div>
      )}
    </div>
  );
}

// Port of lib/features/menu/screens/notifications_screen.dart (+ notifications/widgets/*)
export function NotificationsScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const notif = useNotifications();
  const [filter, setFilter] = useState("all");
  const [clearOpen, setClearOpen] = useState(false);
  const isWeb = u.width > 600;

  useEffect(() => { loadNotifications(); }, []);

  const tap = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    const data = n.data ?? {};
    switch (n.type) {
      case "order_update": case "order_status": { const id = data.orderId?.toString(); if (id != null) router.push(ROUTES.orderStatus(id)); break; }
      case "new_order": case "order_history": router.push(ROUTES.orders); break;
      case "promotion": case "offer": router.push(ROUTES.offer); break;
      case "menu_update": case "new_item": {
        const cat = data.categoryId?.toString();
        if (cat != null) { setExtra(ROUTES.menu, { category: cat }); router.push(ROUTES.menu); } else router.push(ROUTES.menu);
        break;
      }
      case "cart": router.push(ROUTES.cart); break;
      case "profile": case "account": router.push(ROUTES.profile); break;
      default: router.push(ROUTES.home);
    }
  };

  const byType = (...types: string[]) => types.flatMap((ty) => notif.notifications.filter((n) => n.type === ty));
  const filtered = filter === "unread" ? notif.unreadNotifications
    : filter === "orders" ? byType("order_update", "order_status", "new_order")
    : filter === "offers" ? byType("promotion", "offer") : notif.notifications;

  const chip = (value: string, label: string, count: number | null) => {
    const sel = filter === value;
    return (
      <div key={value} onClick={() => setFilter(value)} style={{
        padding: `${u.h(10)}px ${u.w(16)}px`, display: "flex", alignItems: "center", cursor: "pointer", flex: "none", transition: "all 200ms", boxSizing: "border-box",
        background: sel ? `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.8)})` : "#F5F5F5", borderRadius: u.r(20),
        border: sel ? `1.5px solid ${C.primary}` : "0 solid transparent", boxShadow: sel ? `0 3px 8px ${withOpacity(C.primary, 0.3)}` : "none",
      }}>
        <span style={{ fontSize: u.sp(14), fontWeight: sel ? 700 : 600, color: sel ? "#fff" : C.textDark, letterSpacing: 0.2 }}>{label}</span>
        {count != null && count > 0 && (
          <>
            <span style={{ width: u.w(8) }} />
            <span style={{ padding: `${u.h(2)}px ${u.w(8)}px`, background: sel ? "#fff" : C.primary, borderRadius: u.r(10), fontSize: u.sp(11), fontWeight: 700, color: sel ? C.primary : "#fff" }}>{count}</span>
          </>
        )}
      </div>
    );
  };

  let body: React.ReactNode;
  if (notif.isLoading) {
    body = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
        <div style={{ height: u.h(16) }} />
        <div style={{ fontSize: u.sp(14), color: C.textMedium }}>{t("loadingNotifications")}</div>
      </div>
    );
  } else if (!notif.hasNotifications) {
    body = (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
        <div style={{ padding: u.w(32), display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ padding: u.w(40), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.1)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: "50%", display: "flex" }}><Icon name="notifications_off_rounded" size={u.sp(80)} color={withOpacity(C.primary, 0.5)} /></div>
          <div style={{ height: u.h(32) }} />
          <div style={{ fontSize: u.sp(22), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("noNotifications")}</div>
          <div style={{ height: u.h(12) }} />
          <div style={{ fontSize: u.sp(15), color: C.textMedium, lineHeight: 1.5 }}>{t("youWillSeeNotificationsHere")}</div>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div style={{ background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.03)", padding: `${u.h(14)}px ${u.w(16)}px`, overflowX: "auto", flex: "none", display: "flex", gap: u.w(10), position: "relative", zIndex: 1 }}>
          {chip("all", "All", null)}{chip("unread", "Unread", notif.unreadCount > 0 ? notif.unreadCount : null)}{chip("orders", "Orders", null)}{chip("offers", "Offers", null)}
        </div>
        {filtered.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ padding: u.w(32), display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ padding: u.w(32), background: "#F5F5F5", borderRadius: "50%", display: "flex" }}><Icon name="filter_alt_off_rounded" size={u.sp(64)} color="#BDBDBD" /></div>
              <div style={{ height: u.h(24) }} />
              <div style={{ textAlign: "center", fontSize: u.sp(17), fontWeight: 500, color: C.textMedium }}>{t("noNotificationsInThisCategory")}</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `${u.h(16)}px ${u.w(16)}px`, boxSizing: "border-box" }}>
            {filtered.map((n) => <NotificationCard key={n.id} n={n} onTap={tap} />)}
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "#F8F9FA", display: "flex", flexDirection: "column" }}>
      {!isWeb && (
        <div style={{ flex: "none", height: 56, background: "#fff", display: "flex", alignItems: "center", position: "relative", zIndex: 5 }}>
          <button aria-label="Back" onClick={() => router.push(ROUTES.home)} style={{ width: 48, height: 48, margin: "0 4px", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow_back_ios_new_rounded" size={u.sp(20)} color={C.textDark} />
          </button>
          <span style={{ marginLeft: 16, fontSize: u.sp(20), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("notifications")}</span>
          <span style={{ flex: 1 }} />
          {notif.hasNotifications && <AppBarMenu onClearAll={() => setClearOpen(true)} />}
          {!notif.hasNotifications && <span style={{ width: u.w(8) }} />}
        </div>
      )}
      {body}
      <ClearAllDialog open={clearOpen} onClose={() => setClearOpen(false)} />
    </div>
  );
}
