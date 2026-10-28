"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Dialog, Tap, fmt2 } from "@/components/ui/primitives";
import { CustomButton } from "@/components/ui/forms";
import { MButton } from "@/components/ui/MButton";
import { ROUTES, setExtra } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useAuth } from "@/lib/stores/auth";
import { removeItem, updateItemQuantity, useCart } from "@/lib/stores/cart";
import { checkDeliveryAvailability, setDeliveryType, updateDeliveryFee, useCheckout } from "@/lib/stores/commerce";
import { cartStore } from "@/lib/stores/cart";
import { useLanguage } from "@/lib/stores/language";
import { CartItem } from "@/lib/models";

const grey = { 50: "#FAFAFA", 100: "#F5F5F5", 200: "#EEEEEE", 300: "#E0E0E0", 400: "#BDBDBD", 600: "#757575" };

// Port of lib/features/menu/screens/cart_screen.dart (+ cart/widgets/*). Everything runs on web, so kIsWeb is true.
export function CartScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const cart = useCart();
  const isWeb = u.width > 600;
  const [specialInstructions] = useState(""); // controller exists in Dart but its field is commented out => always ''
  useEffect(() => { void checkDeliveryAvailability(); }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: isWeb ? "#F8F9FA" : C.background }}>
      <header style={{ height: 56, flex: "none", background: "#fff", display: "flex", alignItems: "center", position: "relative" }}>
        <Tap ariaLabel="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push(ROUTES.home))} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
          <Icon name="arrow_back_ios" size={u.sp(20)} color={C.textDark} />
        </Tap>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontSize: u.sp(20), fontWeight: 600, color: C.textDark }}>{t("myCart")}</div>
      </header>
      {cart.isEmpty ? <EmptyCartView isWeb={isWeb} /> : isWeb ? <WebLayout specialInstructions={specialInstructions} /> : <MobileLayout specialInstructions={specialInstructions} />}
    </div>
  );
}

function EmptyCartView({ isWeb }: { isWeb: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 500, padding: isWeb ? 48 : 24, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
        <div style={{ padding: isWeb ? 48 : 32, borderRadius: "50%", background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.12)}, ${withOpacity(C.primary, 0.04)})`, display: "flex" }}>
          <Icon name="shopping_cart_outlined" size={isWeb ? 80 : 60} color={C.primary} />
        </div>
        <div style={{ height: isWeb ? 32 : 24 }} />
        <div style={{ fontSize: isWeb ? 28 : 22, fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("emptyCart")}</div>
        <div style={{ height: 12 }} />
        <div style={{ textAlign: "center", fontSize: isWeb ? 16 : 14, color: C.textLight, lineHeight: 1.5 }}>{t("addFoodToStart")}</div>
        <div style={{ height: isWeb ? 40 : 32 }} />
        <div style={{ width: isWeb ? 240 : 200, height: isWeb ? 54 : 59 }}>
          <CustomButton text={t("browseMenu")} onPressed={() => router.push(ROUTES.menu)} />
        </div>
      </div>
    </div>
  );
}

function DeliveryToggle({ isWeb }: { isWeb: boolean }) {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  const isDelivery = co.deliveryType === "delivery";
  const disabled = !co.isDeliveryEnabled;
  const btn = (text: string, selected: boolean, icon: string, onTap?: () => void, isDisabled = false) => {
    const color = isDisabled ? "#BDBDBD" : C.primary;
    const on = selected && !isDisabled;
    return (
      <div style={{ opacity: isDisabled ? 0.5 : 1, flex: 1 }} title={isDisabled ? t("deliveryNotAvailableNow") : undefined}>
        <div onClick={isDisabled ? undefined : onTap} style={{
          cursor: isDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", transition: "all 200ms",
          padding: `${isWeb ? 18 : u.h(12)}px ${isWeb ? 16 : u.w(12)}px`, borderRadius: isWeb ? 12 : u.r(8),
          background: on ? `linear-gradient(135deg, ${color}, ${withOpacity(color, 0.8)})` : isWeb ? grey[50] : "#fff",
          border: `${isWeb ? 0 : 1}px solid ${on ? color : grey[200]}`, boxShadow: on ? `0 4px 12px ${withOpacity(color, 0.25)}` : "none",
        }}>
          <Icon name={icon} size={isWeb ? 22 : u.sp(20)} color={on ? "#fff" : color} />
          <span style={{ width: isWeb ? 10 : u.w(8) }} />
          <span style={{ fontSize: isWeb ? 16 : u.sp(14), fontWeight: 600, color: on ? "#fff" : color, letterSpacing: 0.3, textAlign: "center" }}>{text}</span>
          {isDisabled && (<><span style={{ width: u.w(6) }} /><Icon name="lock_outline" size={u.sp(14)} color="#BDBDBD" /></>)}
        </div>
      </div>
    );
  };
  return (
    <div style={{
      padding: isWeb ? 6 : `${u.h(12)}px ${u.w(16)}px`, ...(isWeb ? { background: "#fff", borderRadius: 16, border: `1px solid ${grey[200]}`, boxShadow: "0 2px 16px rgba(0,0,0,.04)" } : {}),
    }}>
      <div style={{ display: "flex", gap: isWeb ? 8 : u.w(12) }}>
        {btn(t("takeaway"), !isDelivery, "shopping_bag", () => setDeliveryType("pickup"))}
        {btn(t("delivery"), isDelivery, "delivery_dining", disabled ? undefined : () => { setDeliveryType("delivery"); updateDeliveryFee(cartStore.state.items.reduce((s, i) => s + i.totalPrice, 0)); }, disabled)}
      </div>
      {disabled && (
        <>
          <div style={{ height: u.h(12) }} />
          <div style={{ padding: u.w(12), background: "#FFF3E0", borderRadius: u.r(10), border: "1px solid #FFCC80", display: "flex", alignItems: "center" }}>
            <Icon name="info_outline" size={u.sp(20)} color="#F57C00" /><span style={{ width: u.w(10) }} />
            <span style={{ flex: 1, fontSize: u.sp(13), color: "#E65100", fontWeight: 500 }}>{co.deliveryDisabledMessage ?? t("deliveryNotAvailableNow")}</span>
          </div>
        </>
      )}
    </div>
  );
}

function CartItemsList({ isWeb }: { isWeb: boolean }) {
  const u = useScreen();
  const cart = useCart();
  return (
    <div style={{ padding: isWeb ? 0 : `0 ${u.w(16)}px` }}>
      <div style={{ background: "#fff", borderRadius: isWeb ? 20 : u.r(12), border: `1px solid ${grey[200]}`, boxShadow: `0 2px ${isWeb ? 16 : 8}px rgba(0,0,0,.04)` }}>
        {cart.items.map((item, i) => (
          <div key={item.id}>
            <CartRow item={item} isWeb={isWeb} />
            {i < cart.items.length - 1 && <div style={{ height: 1, background: grey[200], margin: `0 ${isWeb ? 28 : u.w(16)}px` }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
function CartRow({ item, isWeb }: { item: CartItem; isWeb: boolean }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const imgW = isWeb ? 130 : u.w(80), imgH = isWeb ? 130 : u.h(80);
  const small = isWeb ? 14 : u.sp(12);
  const stepBtn = (icon: string, onClick: () => void) => (
    <Tap onClick={onClick} style={{
      width: isWeb ? 40 : u.w(30), height: isWeb ? 40 : u.h(30), borderRadius: isWeb ? 12 : u.r(8), display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.8)})`, boxShadow: `0 2px 8px ${withOpacity(C.primary, 0.2)}` }}>
      <Icon name={icon} size={isWeb ? 20 : u.sp(16)} color="#fff" />
    </Tap>
  );
  return (
    <div style={{ padding: isWeb ? 28 : u.w(16), display: "flex", alignItems: "flex-start" }}>
      <div style={{ borderRadius: isWeb ? 18 : u.r(12), overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,.08)", flex: "none", width: imgW, height: imgH, background: failed ? grey[100] : undefined }}>
        {failed ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fastfood" size={isWeb ? 44 : u.sp(30)} color={grey[400]} /></div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.foodItem.imageUrl} alt="" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </div>
      <span style={{ width: isWeb ? 24 : u.w(12), flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ width: isWeb ? 11 : u.w(8), height: isWeb ? 11 : u.h(8), borderRadius: "50%", background: item.foodItem.isVeg ? "#4CAF50" : "#F44336", flex: "none" }} />
          <span style={{ width: isWeb ? 10 : u.w(6) }} />
          <span style={{ flex: 1, fontSize: isWeb ? 19 : u.sp(15), fontWeight: 600, color: C.textDark, letterSpacing: -0.3 }}>{item.foodItem.name}</span>
        </div>
        <div style={{ height: isWeb ? 10 : u.h(6) }} />
        {item.selectedMealSize && <div style={{ paddingBottom: isWeb ? 6 : u.h(2), fontSize: small, color: grey[600], lineHeight: 1.4 }}>{t("sizeLabel")} {item.selectedMealSize.name}</div>}
        {item.selectedExtras.length > 0 && <div style={{ paddingBottom: isWeb ? 6 : u.h(2), fontSize: small, color: grey[600], lineHeight: 1.4 }}>{t("extrasLabel")} {item.selectedExtras.map((e) => e.name).join(", ")}</div>}
        {item.selectedAddons.length > 0 && <div style={{ fontSize: small, color: grey[600], lineHeight: 1.4 }}>{t("addonsLabel")} {item.selectedAddons.map((a) => a.name).join(", ")}</div>}
        <div style={{ height: isWeb ? 14 : u.h(8) }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: isWeb ? 22 : u.sp(16), fontWeight: 700, color: C.primary, letterSpacing: -0.5 }}>{t("currency")}{fmt2(item.totalPrice)}</span>
          <div style={{ display: "flex", alignItems: "center", background: grey[50], borderRadius: isWeb ? 14 : u.r(10), border: `1px solid ${grey[200]}`, padding: isWeb ? 6 : u.w(2) }}>
            {stepBtn(item.quantity > 1 ? "remove" : "delete_outline", () => (item.quantity > 1 ? updateItemQuantity(item.id, item.quantity - 1) : removeItem(item.id)))}
            <div style={{ width: isWeb ? 52 : u.w(42), display: "flex", alignItems: "center", justifyContent: "center", fontSize: isWeb ? 18 : u.sp(15), fontWeight: 600, color: C.textDark }}>{item.quantity}</div>
            {stepBtn("add", () => updateItemQuantity(item.id, item.quantity + 1))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, amount, isTotal = false }: { label: string; amount: number; isTotal?: boolean }) {
  const { t } = useLanguage();
  const fs = isTotal ? 17 : 15; // kIsWeb => web sizes
  return (
    <div style={{ padding: "8px 0", display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: fs, fontWeight: isTotal ? 600 : 500, color: C.textDark }}>{label}</span>
      <span style={{ fontSize: fs, fontWeight: isTotal ? 700 : 600, color: isTotal ? C.primary : C.textDark }}>{t("currency")}{fmt2(amount)}</span>
    </div>
  );
}

function useProceed(special: string) {
  const router = useRouter();
  const auth = useAuth();
  const [dialog, setDialog] = useState(false);
  return {
    dialog, setDialog,
    onProceed: () => {
      if (!auth.isAuthenticated) setDialog(true);
      else { setExtra(ROUTES.checkout, { specialInstructions: special }); router.push(ROUTES.checkout); }
    },
  };
}

function LoginRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const router = useRouter();
  return (
    <Dialog open={open} dismissible={false}>
      <div style={{ background: "#fff", borderRadius: 20, minWidth: 280, maxWidth: 560, padding: 32, boxSizing: "border-box", boxShadow: "0 11px 15px -7px rgba(0,0,0,.2), 0 24px 38px 3px rgba(0,0,0,.14), 0 9px 46px 8px rgba(0,0,0,.12)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.textDark, letterSpacing: -0.5, marginBottom: 16 }}>{t("loginRequired")}</div>
        <div style={{ fontSize: 16, color: C.textMedium, lineHeight: 1.5 }}>Please login to continue with your takeaway order.</div>
        <div style={{ height: 24 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <MButton variant="text" onClick={onClose} padding={[14, 24]} fg={C.textLight} fontSize={15} fontWeight={500}>{t("cancel")}</MButton>
          <MButton onClick={() => { onClose(); setTimeout(() => router.push(ROUTES.login), 50); }} padding={[14, 28]} radius={12} fontSize={15} fontWeight={600} fg="#fff">{t("signIn")}</MButton>
        </div>
      </div>
    </Dialog>
  );
}

function OrderSummaryCard({ special }: { special: string }) {
  const u = useScreen();
  const { t } = useLanguage();
  const cart = useCart();
  const { dialog, setDialog, onProceed } = useProceed(special);
  return (
    <div style={{ padding: 32, background: "#fff", borderRadius: 20, border: `1px solid ${grey[200]}`, boxShadow: "0 4px 24px rgba(0,0,0,.06)", boxSizing: "border-box" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.textDark, letterSpacing: -0.6 }}>{t("orderSummary")}</div>
      <div style={{ height: 28 }} />
      <PriceRow label={t("subtotal")} amount={cart.subtotal} />
      {cart.deliveryFee > 0 && <PriceRow label={t("deliveryFee")} amount={cart.deliveryFee} />}
      <div style={{ padding: "20px 0" }}><div style={{ height: 1, background: "#E0E0E0" }} /></div>
      <PriceRow label={t("total")} amount={cart.total} isTotal />
      <div style={{ height: 32 }} />
      <div style={{ height: 56 }}><CustomButton text={t("proceedToCheckout")} onPressed={onProceed} /></div>
      <LoginRequiredDialog open={dialog} onClose={() => setDialog(false)} />
      <span style={{ display: "none" }}>{u.width}</span>
    </div>
  );
}

function WebLayout({ specialInstructions }: { specialInstructions: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 48px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <DeliveryToggle isWeb />
            <div style={{ height: 24 }} />
            <CartItemsList isWeb />
            <div style={{ height: 24 }} />
            <div style={{ height: 24 }} />
            {/* FrequentlyBoughtSection: getFrequentlyBoughtTogether() always returns [] => renders nothing */}
          </div>
          <span style={{ width: 32, flex: "none" }} />
          <div style={{ width: 420, flex: "none" }}><OrderSummaryCard special={specialInstructions} /></div>
        </div>
      </div>
    </div>
  );
}

function MobileLayout({ specialInstructions }: { specialInstructions: string }) {
  const u = useScreen();
  const { t } = useLanguage();
  const cart = useCart();
  const { dialog, setDialog, onProceed } = useProceed(specialInstructions);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <DeliveryToggle isWeb={false} />
      <div style={{ flex: 1 }}>
        <CartItemsList isWeb={false} />
        <div style={{ height: u.h(16) }} /><div style={{ height: u.h(16) }} />
        <div style={{ height: u.h(100) }} />
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: u.w(16), background: "#fff", boxShadow: "0 -2px 10px rgba(0,0,0,.1)", paddingBottom: `calc(${u.w(16)}px + env(safe-area-inset-bottom))` }}>
        <PriceRow label={t("subtotal")} amount={cart.subtotal} />
        {cart.deliveryFee > 0 && <PriceRow label={t("deliveryFee")} amount={cart.deliveryFee} />}
        <div style={{ height: 1, background: C.divider, margin: "8px 0" }} />
        <PriceRow label={t("total")} amount={cart.total} isTotal />
        <div style={{ height: u.h(16) }} />
        <CustomButton text={t("proceedToCheckout")} onPressed={onProceed} />
        <LoginRequiredDialog open={dialog} onClose={() => setDialog(false)} />
      </div>
    </div>
  );
}
