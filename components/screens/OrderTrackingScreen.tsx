"use client";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/primitives";
import { OrderTrackingInfo } from "@/lib/offerModels";
import { useOrderTracking } from "@/lib/tracking";
import { useLanguage } from "@/lib/stores/language";
import { TrackingMap } from "./TrackingMap";

const jm = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function openWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  const msg = encodeURIComponent("Hi, I'm reaching out about my Saborly delivery.");
  window.open(`https://wa.me/${digits}?text=${msg}`, "_blank", "noopener");
}

const WhatsApp = () => (
  <svg width="24" height="24" viewBox="0 0 448 512" fill="#25D366" aria-hidden>
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);

const banner = (bg: string, icon: string, color: string, text: string) => (
  <div style={{ width: "100%", background: bg, padding: "8px 16px", boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: "center" }}>
    <Icon name={icon} size={16} color={color} /><span style={{ width: 8 }} />
    <span style={{ fontSize: 12, color: C.textMedium }}>{text}</span>
  </div>
);

function EtaBadge({ eta }: { eta: Date }) {
  const mins = Math.trunc((eta.getTime() - Date.now()) / 60000);
  return (
    <div style={{ position: "absolute", top: 16, left: 16, right: 16, padding: "12px 16px", background: C.cardBackground, borderRadius: 16, boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex", alignItems: "center", boxSizing: "border-box" }}>
      <div style={{ padding: 8, background: withOpacity(C.primary, 0.12), borderRadius: "50%", display: "flex" }}><Icon name="access_time_filled_rounded" size={18} color={C.primary} /></div>
      <span style={{ width: 12 }} />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.textDark }}>{mins > 0 ? `Arriving in ${mins} min` : "Arriving any moment"}</div>
        <div style={{ fontSize: 11.5, color: C.textMedium }}>Estimated by {jm(eta)}</div>
      </div>
    </div>
  );
}

function InfoPanel({ t }: { t: OrderTrackingInfo }) {
  return (
    <div style={{ padding: 20, background: C.cardBackground, borderRadius: "24px 24px 0 0", boxShadow: "0 -4px 24px rgba(0,0,0,.06)", boxSizing: "border-box" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.textDark }}>{t.trackingStageLabel}</div>
      <div style={{ height: 4 }} />
      <div style={{ fontSize: 13, color: C.textMedium }}>{t.isLive ? "Live location updating" : "Waiting for driver to start sharing location"}</div>
      {t.driverName && (
        <>
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: withOpacity(C.primary, 0.12), color: C.primary, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{t.driverName[0].toUpperCase()}</div>
            <span style={{ width: 12 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.driverName}</div>
              <div style={{ fontSize: 12, color: C.textLight }}>Your driver</div>
            </div>
            {t.driverPhone && (
              <>
                <button onClick={() => openWhatsApp(t.driverPhone!)} style={{ width: 48, height: 48, border: 0, borderRadius: "50%", background: "rgba(37,211,102,.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><WhatsApp /></button>
                <span style={{ width: 8 }} />
                <button onClick={() => { window.location.href = `tel:${t.driverPhone}`; }} style={{ width: 48, height: 48, border: 0, borderRadius: "50%", background: withOpacity(C.primary, 0.1), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="call_rounded" size={24} color={C.primary} /></button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Port of order_tracking_screen.dart. The Flutter web build ships no Google Maps JS script (blank map there); TrackingMap is a deliberate addition driven by NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
export function OrderTrackingScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { tracking, isLoading, error, usingFallbackPolling } = useOrderTracking(orderId);
  const terminal = tracking != null && ["delivered", "cancelled", "refunded"].includes(tracking.status);
  return (
    <div style={{ flex: 1, background: C.background, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 4px", color: C.textDark, flex: "none" }}>
        <button aria-label="Back" onClick={() => router.back()} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow_back" size={24} color={C.textDark} /></button>
        <span style={{ width: 8 }} />
        <span style={{ fontSize: 20, fontWeight: 700 }}>{t("trackOrder")}</span>
      </div>
      {isLoading && !tracking ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>
      ) : error && !tracking ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMedium }}>{error}</div>
      ) : tracking ? (
        <>
          {usingFallbackPolling && banner(withOpacity(C.warning, 0.12), "sync_rounded", C.warning, "Reconnecting for live updates…")}
          {tracking.isStale && banner(withOpacity(C.error, 0.1), "warning_amber_rounded", C.error, "Driver's location hasn't updated recently")}
          <div style={{ flex: 1, position: "relative", minHeight: 240 }}>
            <TrackingMap t={tracking} />
            {!terminal && tracking.estimatedDeliveryTime && <EtaBadge eta={tracking.estimatedDeliveryTime} />}
          </div>
          <InfoPanel t={tracking} />
        </>
      ) : null}
    </div>
  );
}
