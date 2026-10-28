"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Tap } from "@/components/ui/primitives";
import { CustomButton } from "@/components/ui/forms";
import { MButton } from "@/components/ui/MButton";
import { showSnack } from "@/components/ui/Toast";
import { CodPaymentType, PaymentMethod } from "@/lib/models";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import {
  processPayment, selectPaymentMethod, setCodPaymentType, syncPaymentMethodWithDeliveryType, useCheckout, usePayment, paymentStore,
} from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";

const methodName = (m: PaymentMethod) =>
  m === "shop" ? "Shop Payment" : m === "cashOnDelivery" ? "Cash on Delivery" : m === "paypal" ? "PayPal" : m === "stripe" ? "Stripe" : m === "card" ? "Card" : "None Selected";

// Port of lib/features/menu/screens/payment_scree.dart + payment/widgets/*
export function PaymentScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const pay = usePayment();
  const co = useCheckout();
  const isWeb = u.width > 600;
  useEffect(() => { syncPaymentMethodWithDeliveryType(); }, []);

  const doProcess = async () => {
    const ok = await processPayment();
    if (ok) {
      showSnack(
        <span style={{ display: "flex", alignItems: "center" }}><Icon name="check_circle_rounded" size={u.sp(24)} color="#fff" /><span style={{ width: u.w(12) }} />
          <span style={{ fontSize: u.sp(15), fontWeight: 600, color: "#fff" }}>{t("orderPlacedSuccessfully")}</span></span>,
        { bg: "#43A047", durationMs: 3000, radius: `${u.r(12)}px` });
      const id = paymentStore.state.orderId;
      if (id != null) { await new Promise((r) => setTimeout(r, 500)); router.push(ROUTES.orderStatus(id)); }
      else showSnack(
        <span style={{ display: "flex", alignItems: "center" }}><Icon name="error_rounded" size={u.sp(20)} color="#fff" /><span style={{ width: u.w(8) }} /><span style={{ fontSize: u.sp(14) }}>{t("errorFailedToLoadOrder")}</span></span>,
        { bg: "#F57C00", radius: `${u.r(12)}px` });
    } else {
      showSnack(
        <span style={{ display: "flex", alignItems: "center" }}><Icon name="error_rounded" size={u.sp(20)} color="#fff" /><span style={{ width: u.w(12) }} />
          <span style={{ flex: 1, fontSize: u.sp(14) }}>{paymentStore.state.error ?? t("paymentFailed")}</span></span>,
        { bg: "#D32F2F", durationMs: 4000, radius: `${u.r(12)}px` });
    }
  };

  const isPickup = co.deliveryType === "pickup";
  const banner = (
    <div style={{ padding: u.w(16), borderRadius: u.r(12), display: "flex", alignItems: "center",
      background: `linear-gradient(90deg, ${withOpacity(isPickup ? C.success : C.primary, 0.15)}, ${withOpacity(isPickup ? C.success : C.primary, 0.05)})`, border: `1px solid ${withOpacity(isPickup ? C.success : C.primary, 0.3)}` }}>
      <div style={{ padding: u.w(12), background: isPickup ? C.success : C.primary, borderRadius: u.r(10), display: "flex" }}><Icon name={isPickup ? "store" : "delivery_dining"} size={u.sp(24)} color="#fff" /></div>
      <span style={{ width: u.w(16) }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: u.sp(16), fontWeight: 700, color: C.textDark }}>{isPickup ? t("pickupOrder") : t("deliveryOrder")}</div>
        <div style={{ height: u.h(4) }} />
        <div style={{ fontSize: u.sp(13), color: C.textLight }}>{isPickup ? t("payAtShopDescription") : co.isDeliveryEnabled ? t("choosePaymentDelivery") : t("deliveryDisabled")}</div>
        {!co.isDeliveryEnabled && !isPickup && (
          <>
            <div style={{ height: u.h(8) }} />
            <MButton variant="text" onClick={() => router.back()} fg={C.primary} fontSize={u.sp(12)} fontWeight={600}>{t("returnToCheckout")}</MButton>
          </>
        )}
      </div>
    </div>
  );

  const sectionHeader = (title: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ width: u.w(4), height: u.h(24), background: color, borderRadius: u.r(2) }} /><span style={{ width: u.w(12) }} />
      <span style={{ fontSize: u.sp(17), fontWeight: 700, color, letterSpacing: -0.3 }}>{title}</span>
    </div>
  );
  const methodCard = (name: string, icon: string, color: string, method: PaymentMethod, available: boolean, description: string) => {
    const sel = pay.selectedPaymentMethod === method && available;
    return (
      <div onClick={available ? () => selectPaymentMethod(method) : undefined} style={{ cursor: available ? "pointer" : "default", padding: u.w(20), borderRadius: u.r(14), transition: "all 250ms ease-in-out", boxSizing: "border-box",
        background: sel ? withOpacity(color, 0.08) : available ? "rgba(158,158,158,.02)" : "rgba(158,158,158,.01)", border: `${sel ? 2.5 : 1.5}px solid ${sel ? color : withOpacity(C.border, 0.3)}` }}>
        <div style={{ display: "flex", alignItems: "center", opacity: available ? 1 : 0.4 }}>
          <div style={{ width: u.w(60), height: u.h(60), borderRadius: u.r(14), background: `linear-gradient(135deg, ${withOpacity(color, 0.15)}, ${withOpacity(color, 0.05)})`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon name={icon} size={u.sp(30)} color={color} />
          </div>
          <span style={{ width: u.w(20) }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: u.sp(16), fontWeight: 600, color: available ? C.textDark : C.textLight, letterSpacing: -0.2 }}>{name}</span>
              {!available && (<><span style={{ width: u.w(10) }} /><span style={{ padding: `${u.h(4)}px ${u.w(8)}px`, background: withOpacity(C.textLight, 0.12), borderRadius: u.r(6), fontSize: u.sp(10), fontWeight: 600, color: C.textLight, letterSpacing: 0.5 }}>{t("comingSoon")}</span></>)}
            </div>
            <div style={{ height: u.h(6) }} />
            <div style={{ fontSize: u.sp(13), color: withOpacity(C.textLight, 0.8), lineHeight: 1.3 }}>{description}</div>
          </div>
          <div style={{ width: u.w(32), height: u.h(32), borderRadius: "50%", background: color, boxShadow: `0 3px 10px ${withOpacity(color, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", transform: sel ? "scale(1)" : "scale(0)", transition: "transform 250ms ease-in-out" }}>
            <Icon name="check_rounded" size={u.sp(20)} color="#fff" />
          </div>
        </div>
      </div>
    );
  };
  const codCard = (name: string, icon: string, type: CodPaymentType, description: string) => {
    const sel = pay.codPaymentType === type;
    return (
      <div onClick={() => setCodPaymentType(type)} style={{ flex: 1, cursor: "pointer", padding: u.w(16), borderRadius: u.r(14), transition: "all 250ms ease-in-out", boxSizing: "border-box", textAlign: "center",
        background: sel ? withOpacity(C.primary, 0.08) : "rgba(158,158,158,.02)", border: `${sel ? 2.5 : 1.5}px solid ${sel ? C.primary : withOpacity(C.border, 0.3)}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: u.w(56), height: u.h(56), borderRadius: u.r(14), background: `linear-gradient(135deg, ${withOpacity(C.primary, sel ? 0.2 : 0.1)}, ${withOpacity(C.primary, sel ? 0.1 : 0.05)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={u.sp(28)} color={C.primary} />
        </div>
        <div style={{ height: u.h(12) }} />
        <div style={{ fontSize: u.sp(15), fontWeight: 700, color: C.textDark, letterSpacing: -0.2 }}>{name}</div>
        <div style={{ height: u.h(4) }} />
        <div style={{ fontSize: u.sp(12), color: withOpacity(C.textLight, 0.8) }}>{description}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ width: u.w(28), height: u.h(28), borderRadius: "50%", background: C.primary, boxShadow: `0 2px 8px ${withOpacity(C.primary, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", transform: sel ? "scale(1)" : "scale(0)", transition: "transform 250ms ease-in-out" }}>
          <Icon name="check_rounded" size={u.sp(16)} color="#fff" />
        </div>
      </div>
    );
  };

  const paymentCard = (
    <div style={{ background: "#fff", borderRadius: u.r(16), boxShadow: "0 4px 20px rgba(0,0,0,.04)", padding: isWeb ? u.w(32) : u.w(20) }}>
      {sectionHeader(isPickup ? t("shopPayment") : t("deliveryPayment"), isPickup ? C.success : C.primary)}
      <div style={{ height: u.h(20) }} />
      {isPickup ? methodCard(t("payAtShop"), "store_outlined", C.success, "shop", true, t("payAtShopDescription")) : (
        <>
          {sectionHeader(t("choosePaymentType"), C.primary)}
          <div style={{ height: u.h(16) }} />
          <div style={{ display: "flex", gap: u.w(16) }}>
            {codCard(t("cash"), "payments_outlined", "cash", t("payWithCash"))}
            {codCard(t("card"), "credit_card", "card", t("payWithCard"))}
          </div>
        </>
      )}
      <div style={{ height: u.h(32) }} />
      <div style={{ height: 1, background: withOpacity(C.border, 0.3) }} />
      <div style={{ height: u.h(32) }} />
      {sectionHeader(t("otherOptionsComingSoon"), C.textLight)}
      <div style={{ height: u.h(20) }} />
      {methodCard(t("paypal"), "account_balance_wallet_outlined", "#0070BA", "paypal", false, t("paypalDescription"))}
      <div style={{ height: u.h(16) }} />
      {methodCard(t("stripe"), "credit_card_outlined", "#635BFF", "stripe", false, t("stripeDescription"))}
      <div style={{ height: u.h(16) }} />
      {methodCard(t("card"), "credit_card", "#1A1F71", "card", false, t("cardDescription"))}
    </div>
  );

  const row = (label: string, value: string, hi = false) => (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: u.sp(14), color: C.textLight, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: u.sp(14), fontWeight: hi ? 600 : 500, color: hi ? C.primary : C.textDark }}>{value}</span>
    </div>
  );
  const accent = isPickup ? C.success : C.primary;
  const summary = (
    <div style={{ background: "#fff", borderRadius: u.r(16), boxShadow: "0 4px 20px rgba(0,0,0,.04)", padding: u.w(24) }}>
      <div style={{ fontSize: u.sp(18), fontWeight: 700, color: C.textDark }}>{t("paymentSummary")}</div>
      <div style={{ height: u.h(24) }} />
      {row(t("orderType"), isPickup ? t("pickup") : t("delivery"))}
      <div style={{ height: u.h(12) }} />
      {row(t("paymentMethod"), methodName(pay.selectedPaymentMethod), true)}
      {pay.selectedPaymentMethod === "cashOnDelivery" && pay.codPaymentType != null && (<><div style={{ height: u.h(12) }} />{row(t("paymentType"), pay.codPaymentType === "cash" ? t("cash") : t("card"), true)}</>)}
      <div style={{ height: u.h(16) }} />
      <div style={{ padding: u.w(16), background: withOpacity(accent, 0.05), borderRadius: u.r(12), border: `1px solid ${withOpacity(accent, 0.2)}`, display: "flex", alignItems: "center" }}>
        <Icon name="info_outline" size={u.sp(20)} color={accent} /><span style={{ width: u.w(12) }} />
        <span style={{ flex: 1, fontSize: u.sp(13), color: accent, fontWeight: 500 }}>{isPickup ? t("payAtShopCounter") : pay.codPaymentType === "cash" ? t("payWithCashOnDelivery") : t("payWithCardOnDelivery")}</span>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.background }}>
      <header style={{ height: 56, flex: "none", background: "#fff", display: "flex", alignItems: "center", position: "relative" }}>
        <Tap ariaLabel="Back" onClick={() => router.back()} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
          <Icon name="arrow_back_ios" size={u.sp(20)} color={C.textDark} />
        </Tap>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontSize: u.sp(18), fontWeight: 600, color: C.textDark }}>{t("selectPaymentMethod")}</div>
      </header>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: isWeb ? 900 : undefined, boxSizing: "border-box", padding: `${isWeb ? u.h(48) : u.h(24)}px ${isWeb ? u.w(48) : u.w(16)}px` }}>
          {banner}
          <div style={{ height: u.h(24) }} />
          {isWeb ? (
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 2, minWidth: 0 }}>{paymentCard}</div>
              <span style={{ width: u.w(32) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {summary}
                <div style={{ height: u.h(24) }} />
                <CustomButton text={t("confirm")} isLoading={pay.isProcessing} onPressed={() => void doProcess()} />
              </div>
            </div>
          ) : <>{paymentCard}<div style={{ height: u.h(100) }} /></>}
        </div>
      </div>
      {!isWeb && (
        <div style={{ flex: "none", position: "sticky", bottom: 0, padding: u.w(16), background: "#fff", boxShadow: "0 -4px 20px rgba(0,0,0,.08)", paddingBottom: `calc(${u.w(16)}px + env(safe-area-inset-bottom))` }}>
          <CustomButton text={t("confirm")} isLoading={pay.isProcessing} onPressed={() => void doProcess()} />
        </div>
      )}
    </div>
  );
}
