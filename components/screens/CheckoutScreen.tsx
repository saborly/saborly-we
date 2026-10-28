"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Tap, fmt2 } from "@/components/ui/primitives";
import { CustomButton } from "@/components/ui/forms";
import { MButton } from "@/components/ui/MButton";
import { AddressSelectionDialog } from "@/components/checkout/AddressDialog";
import { MAX_DELIVERY_DISTANCE_KM } from "@/lib/delivery";
import { CartItem } from "@/lib/models";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useCart } from "@/lib/stores/cart";
import {
  canDeliver, canPlaceOrder, checkDeliveryAvailability, getDeliveryDistanceText, getDeliveryFeeText, isReadyForOrder, loadBranches, loadCurrentBranchCoords,
  loadSavedAddresses, onCartAttached, seedFromDetectedLocation, setDeliveryType, startHoursMonitoring, syncPaymentMethodWithDeliveryType, updateDeliveryFee, useCheckout, usePayment,
} from "@/lib/stores/commerce";
import { useLanguage } from "@/lib/stores/language";
import { getTimeUntilClosing } from "@/lib/timeUtils";

const grey = { 50: "#FAFAFA", 100: "#F5F5F5", 200: "#EEEEEE", 300: "#E0E0E0", 400: "#BDBDBD" };
// MaterialColor shades used by the checkout banners
const RED = { 50: "#FFEBEE", 100: "#FFCDD2", 200: "#EF9A9A", 300: "#E57373", 600: "#E53935", 700: "#D32F2F", 800: "#C62828", 900: "#B71C1C" };
const ORANGE = { 50: "#FFF3E0", 200: "#FFCC80", 700: "#F57C00", 900: "#E65100" };
const GREEN = { 500: "#4CAF50", 700: "#388E3C", 800: "#2E7D32" };

// Port of lib/features/menu/screens/checkout_screen.dart (+ checkout/widgets/*). Runs on web => kIsWeb sizes in the sub-widgets.
export function CheckoutScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const co = useCheckout();
  const cart = useCart();
  const [dialog, setDialog] = useState(false);
  usePayment();

  useEffect(() => {
    onCartAttached();
    void (async () => {
      await checkDeliveryAvailability();
      startHoursMonitoring();
      void loadBranches();
      await loadCurrentBranchCoords();
      await loadSavedAddresses();
      seedFromDetectedLocation();
      updateDeliveryFee(cart.subtotal);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // PaymentProvider.initialize() runs on every build of CheckoutScreen; it only notifies when values change
  useEffect(() => { syncPaymentMethodWithDeliveryType(); }, [co.deliveryType]);

  const isWeb = u.width > 900;
  const showDelivery = co.deliveryType === "delivery" && co.isDeliveryEnabled;
  const left = (
    <>
      <DeliveryTypeSelector />
      {isWeb ? <div style={{ height: 24 }} /> : null}
      {showDelivery ? <><DeliveryAddressSection onChange={() => setDialog(true)} />{isWeb && <div style={{ height: 24 }} />}</> : <><BranchInfo />{isWeb && <div style={{ height: 24 }} />}</>}
      <PickupTimePreference />
    </>
  );
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F8F9FA", minHeight: 0 }}>
      <header style={{ height: 56, flex: "none", background: "#fff", display: "flex", alignItems: "center", position: "relative" }}>
        <Tap ariaLabel="Back" onClick={() => router.back()} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
          <Icon name="arrow_back_ios" size={u.sp(20)} color={C.textDark} />
        </Tap>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontSize: u.sp(18), fontWeight: 600, color: C.textDark }}>{t("checkout")}</div>
      </header>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: isWeb ? 1400 : undefined }}>
          {isWeb ? (
            <div style={{ padding: "40px 48px" }}>
              <RestaurantClosedBanner />
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 7, minWidth: 0 }}>{left}</div>
                <span style={{ width: 32, flex: "none" }} />
                <div style={{ width: 420, flex: "none" }}>
                  <CartSummary />
                  <div style={{ height: 24 }} />
                  <WebCheckoutButton />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <RestaurantClosedBanner />
              {left}
              <CartSummary />
              <div style={{ height: u.h(100) }} />
            </div>
          )}
        </div>
      </div>
      {!isWeb && <BottomBar />}
      <AddressSelectionDialog open={dialog} onClose={() => setDialog(false)} />
    </div>
  );
}

const cardBase = (): React.CSSProperties => ({
  padding: 28, background: "#fff", borderRadius: 20, border: `1px solid ${grey[200]}`, boxShadow: "0 2px 16px rgba(0,0,0,.04)", boxSizing: "border-box",
});

function DeliveryTypeSelector() {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  const cart = useCart();
  const isDelivery = co.deliveryType === "delivery", disabled = !co.isDeliveryEnabled;
  const btn = (text: string, icon: string, selected: boolean, onTap?: () => void, isDisabled = false) => {
    const color = isDisabled ? grey[400] : C.primary, on = selected && !isDisabled;
    return (
      <div style={{ flex: 1, opacity: isDisabled ? 0.5 : 1 }} title={isDisabled ? co.deliveryDisabledMessage ?? t("deliveryNotAvailableNow") : undefined}>
        <div onClick={isDisabled ? undefined : onTap} style={{
          cursor: isDisabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 16px", borderRadius: 12, transition: "all 200ms", boxSizing: "border-box",
          background: on ? `linear-gradient(135deg, ${color}, ${withOpacity(color, 0.8)})` : isDisabled ? grey[100] : grey[50], border: isDisabled ? `1.5px solid ${grey[300]}` : "none",
          boxShadow: on ? `0 4px 12px ${withOpacity(color, 0.25)}` : "none",
        }}>
          <Icon name={icon} size={22} color={on ? "#fff" : color} /><span style={{ width: 10 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: on ? "#fff" : color, letterSpacing: 0.3 }}>{text}</span>
          {isDisabled && (<><span style={{ width: u.w(6) }} /><Icon name="lock_outline" size={u.sp(16)} color={grey[400]} /></>)}
        </div>
      </div>
    );
  };
  return (
    <div style={{ padding: 6, background: "#fff", borderRadius: 16, border: `1px solid ${grey[200]}`, boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {btn(t("pickup"), "shopping_bag", !isDelivery, () => setDeliveryType("pickup"))}
        {btn(t("delivery"), "delivery_dining", isDelivery, disabled ? undefined : () => { setDeliveryType("delivery"); updateDeliveryFee(cart.subtotal); }, disabled)}
      </div>
      {disabled && (
        <>
          <div style={{ height: u.h(12) }} />
          <div style={{ padding: u.w(12), background: ORANGE[50], borderRadius: u.r(10), border: `1px solid ${ORANGE[200]}`, display: "flex", alignItems: "center" }}>
            <Icon name="info_outline" size={u.sp(20)} color={ORANGE[700]} /><span style={{ width: u.w(10) }} />
            <span style={{ flex: 1, fontSize: u.sp(13), color: ORANGE[900], fontWeight: 500 }}>{co.deliveryDisabledMessage ?? t("deliveryNotAvailableNow")}</span>
          </div>
        </>
      )}
    </div>
  );
}

function BranchInfo() {
  const { t } = useLanguage();
  const co = useCheckout();
  const b = co.selectedBranch;
  return (
    <div style={{ padding: 28, background: "#fff", borderRadius: 20, border: `1px solid ${grey[200]}`, boxShadow: "0 2px 16px rgba(0,0,0,.04)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: C.textDark, letterSpacing: -0.3 }}>{t("pickupLocation")}</span>
        <div style={{ padding: 14, background: withOpacity(C.primaryLight, 0.15), borderRadius: 14, display: "flex" }}><Icon name="store" size={26} color={C.primary} /></div>
      </div>
      <div style={{ height: 24 }} />
      {b && (
        <>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ padding: 10, background: withOpacity(C.primary, 0.1), borderRadius: 10, display: "flex" }}><Icon name="location_on" size={22} color={C.primary} /></div>
            <span style={{ width: 14 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: C.textDark, letterSpacing: -0.2 }}>{b.name}</div>
              <div style={{ height: 8 }} />
              <div style={{ fontSize: 15, color: C.textMedium, lineHeight: 1.5 }}>{b.address}</div>
            </div>
          </div>
          <div style={{ height: 20 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ padding: 10, background: withOpacity(C.textLight, 0.1), borderRadius: 10, display: "flex" }}><Icon name="phone" size={20} color={C.textLight} /></div>
            <span style={{ width: 14 }} />
            <span style={{ fontSize: 15, color: C.textMedium, fontWeight: 500 }}>{b.phone}</span>
          </div>
        </>
      )}
    </div>
  );
}

function PickupTimePreference() {
  const { t } = useLanguage();
  return (
    <div style={{ padding: 28, background: "#fff", borderRadius: 20, border: `1px solid ${grey[200]}`, boxShadow: "0 2px 16px rgba(0,0,0,.04)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: 10, background: withOpacity(C.primary, 0.1), borderRadius: 10, display: "flex" }}><Icon name="access_time" size={22} color={C.primary} /></div>
        <span style={{ width: 14 }} />
        <span style={{ fontSize: 20, fontWeight: 600, color: C.textDark, letterSpacing: -0.3 }}>{t("pickupTime")}</span>
      </div>
      <div style={{ height: 24 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 20px", background: C.primary, borderRadius: 14, border: `2px solid ${C.primary}`, boxShadow: `0 4px 12px ${withOpacity(C.primary, 0.15)}` }}>
        <Icon name="check_circle" size={20} color="#fff" /><span style={{ width: 10 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: 0.2 }}>{t("today")}</span>
      </div>
    </div>
  );
}

function DeliveryAddressSection({ onChange }: { onChange: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  const cart = useCart();
  const a = co.selectedAddress;
  return (
    <div style={{ padding: u.w(32), background: "#fff", borderRadius: u.r(20), border: `1.5px solid ${grey[100]}`, boxShadow: "0 4px 24px rgba(0,0,0,.03)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: u.w(12), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.15)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: u.r(12), display: "flex" }}><Icon name="location_on_rounded" size={u.sp(24)} color={C.primary} /></div>
        <span style={{ width: u.w(16) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: u.sp(20), fontWeight: 700, color: C.textDark, letterSpacing: -0.5, lineHeight: 1.2 }}>{t("delivery")}</div>
          {!a && <div style={{ fontSize: u.sp(14), color: C.textLight, lineHeight: 1.3 }}>{t("chooseDeliveryAddress")}</div>}
        </div>
      </div>
      <div style={{ height: u.h(24) }} />
      {a ? (
        <>
          <div style={{ padding: u.w(20), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.03)}, #fff)`, borderRadius: u.r(16), border: `1.5px solid ${withOpacity(C.primary, 0.3)}`, display: "flex", alignItems: "flex-start" }}>
            <div style={{ padding: u.w(12), background: C.primary, borderRadius: u.r(12), boxShadow: `0 4px 8px ${withOpacity(C.primary, 0.3)}`, display: "flex" }}><Icon name="home_rounded" size={u.sp(24)} color="#fff" /></div>
            <span style={{ width: u.w(16) }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: u.sp(16), fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{t("addressType") || t("home")}</span>
                {a.isDefault && (<><span style={{ width: u.w(8) }} /><span style={{ padding: `${u.h(4)}px ${u.w(8)}px`, background: C.primary, borderRadius: u.r(6), fontSize: u.sp(11), color: "#fff", fontWeight: 600, letterSpacing: 0.3 }}>{t("default")}</span></>)}
              </div>
              <div style={{ height: u.h(8) }} />
              <div style={{ fontSize: u.sp(14), color: C.textMedium, lineHeight: 1.5, letterSpacing: -0.1 }}>{a.address}</div>
            </div>
          </div>
          <div style={{ height: u.h(20) }} />
          {co.deliveryDistance != null && <DeliveryInfoBanner subtotal={cart.subtotal} />}
          <div style={{ height: u.h(16) }} />
          <MButton variant="text" onClick={onChange} padding={[u.h(12), u.w(16)]} fg={C.primary} fontSize={u.sp(15)} fontWeight={600} fontFamily="inherit">
            <Icon name="edit_location_alt_rounded" size={u.sp(20)} color={C.primary} /><span style={{ width: 8 }} /><span>{t("changeAddress")}</span>
          </MButton>
        </>
      ) : (
        <div style={{ padding: u.w(48), background: `linear-gradient(180deg, ${grey[50]}, #fff)`, borderRadius: u.r(16), border: `1.5px solid ${grey[200]}`, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
          <div style={{ padding: u.w(24), background: `linear-gradient(135deg, ${grey[100]}, ${grey[50]})`, borderRadius: "50%", display: "flex" }}><Icon name="add_location_alt_rounded" size={u.sp(56)} color={grey[400]} /></div>
          <div style={{ height: u.h(24) }} />
          <div style={{ fontSize: u.sp(18), fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{t("noDeliveryAddress")}</div>
          <div style={{ height: u.h(8) }} />
          <div style={{ fontSize: u.sp(14), color: C.textLight, lineHeight: 1.4, textAlign: "center" }}>{t("addDeliveryAddress")}</div>
          <div style={{ height: u.h(24) }} />
          <MButton onClick={onChange} padding={[u.h(16), u.w(32)]} radius={u.r(12)} fontSize={u.sp(15)} fontWeight={600} fontFamily="inherit">
            <Icon name="add_rounded" size={20} color="#fff" /><span style={{ width: 8 }} /><span style={{ letterSpacing: -0.2 }}>{t("addAddress")}</span>
          </MButton>
        </div>
      )}
    </div>
  );
}

function DeliveryInfoBanner({ subtotal }: { subtotal: number }) {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  const ok = canDeliver(co);
  const primary = ok ? "#4CAF50" : "#F44336";
  const s700 = ok ? GREEN[700] : RED[700], s800 = ok ? GREEN[800] : RED[800];
  return (
    <div style={{ padding: u.w(20), background: `linear-gradient(135deg, ${withOpacity(primary, 0.08)}, ${withOpacity(primary, 0.02)})`, borderRadius: u.r(16), border: `1.5px solid ${withOpacity(primary, 0.3)}` }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: u.w(10), background: primary, borderRadius: u.r(10), boxShadow: `0 3px 8px ${withOpacity(primary, 0.3)}`, display: "flex" }}><Icon name={ok ? "check_circle_rounded" : "error_rounded"} size={u.sp(22)} color="#fff" /></div>
        <span style={{ width: u.w(16) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: u.sp(16), fontWeight: 700, color: s800, letterSpacing: -0.3 }}>{ok ? t("deliveryAvailable") : t("deliveryNotAvailable")}</div>
          <div style={{ height: u.h(4) }} />
          <div style={{ fontSize: u.sp(14), color: s700, lineHeight: 1.3 }}>
            {ok ? `${t("distance")}: ${getDeliveryDistanceText()}` : `${t("addressBeyondRange")} ${MAX_DELIVERY_DISTANCE_KM}${t("km")}${t("delivery")}${t("range")}`}
          </div>
        </div>
      </div>
      {ok && (
        <>
          <div style={{ height: 16 }} />
          <div style={{ padding: u.w(16), background: "#fff", borderRadius: u.r(12), border: `1px solid ${withOpacity(primary, 0.2)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Icon name="local_shipping_rounded" size={u.sp(20)} color={s700} /><span style={{ width: u.w(8) }} />
                <span style={{ fontSize: u.sp(14), color: C.textMedium, fontWeight: 500 }}>{t("deliveryFee")}</span>
              </div>
              <span style={{ fontSize: u.sp(16), fontWeight: 700, color: s800, letterSpacing: -0.3 }}>{getDeliveryFeeText() ?? t("calculating")}</span>
            </div>
            {subtotal < 20 && co.deliveryDistance! <= 3 && (
              <>
                <div style={{ height: u.h(12) }} />
                <div style={{ padding: u.w(12), background: ORANGE[50], borderRadius: u.r(10), border: `1px solid ${ORANGE[200]}`, display: "flex", alignItems: "center" }}>
                  <Icon name="celebration_rounded" size={u.sp(18)} color={ORANGE[700]} /><span style={{ width: u.w(8) }} />
                  <span style={{ flex: 1, fontSize: u.sp(13), color: ORANGE[900], fontWeight: 600, lineHeight: 1.3 }}>{t("add")} €{fmt2(20 - subtotal)} {t("addMoreForFree")}{"}"}!</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CartSummary() {
  const { t } = useLanguage();
  const co = useCheckout();
  const cart = useCart();
  const itemRow = (it: CartItem) => (
    <div key={it.id} style={{ marginBottom: 12, padding: 14, background: C.background, borderRadius: 12, display: "flex", alignItems: "center" }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: C.primary, flex: "none" }} />
      <span style={{ width: 14 }} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.textDark, letterSpacing: -0.2 }}>{it.foodItem.name}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{t("currency")}{fmt2(it.totalPrice)}</span>
    </div>
  );
  return (
    <div style={{ ...cardBase() }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: C.textDark, letterSpacing: -0.3 }}>{t("cartSummary")}</span>
        <span style={{ padding: "7px 14px", background: C.primary, borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff" }}>{co.deliveryType === "delivery" ? t("delivery") : t("takeaway")}</span>
      </div>
      <div style={{ height: 24 }} />
      {cart.items.length > 0 ? (
        <>
          {cart.items.slice(0, 3).map(itemRow)}
          {cart.items.length > 3 && (
            <div style={{ paddingTop: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", padding: "10px 14px", background: C.background, borderRadius: 10 }}>
                <Icon name="shopping_bag_outlined" size={16} color={C.textLight} /><span style={{ width: 8 }} />
                <span style={{ fontSize: 13, color: C.textLight, fontWeight: 500 }}>{t("moreItems").replace("{count}", String(cart.items.length - 3))}</span>
              </div>
            </div>
          )}
          <div style={{ height: 24 }} />
          {/* first-order discount rows are mobile-only (!kIsWeb) and never render on web */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: C.textMedium }}>{t("subtotal")}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.textDark }}>€{fmt2(cart.subtotal)}</span>
          </div>
          <div style={{ height: 12 }} />
          {co.deliveryType === "delivery" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: C.textMedium }}>{t("deliveryfee")}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: canDeliver(co) ? C.textDark : "#F44336" }}>{getDeliveryFeeText() ?? t("calculating")}</span>
              </div>
              <div style={{ height: 12 }} />
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.textDark }}>{t("total")}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>€{fmt2(cart.total)}</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 15, color: C.textMedium, fontWeight: 500 }}>{t("cartEmpty")}</div>
      )}
    </div>
  );
}

function RestaurantClosedBanner() {
  const u = useScreen();
  const { t } = useLanguage();
  const co = useCheckout();
  if (co.isRestaurantOpen) return null;
  const hours: [string, string][] = [["Monday - Thursday", "12:00 PM - 11:00 PM"], ["Friday - Saturday", "12:00 PM - 12:00 AM"], ["Sunday", "12:00 PM - 11:00 PM"]];
  return (
    <div style={{ marginBottom: 24, padding: u.w(24), background: `linear-gradient(135deg, ${RED[50]}, ${withOpacity(RED[100], 0.3)})`, borderRadius: u.r(16), border: `2px solid ${RED[300]}`, boxShadow: "0 4px 12px rgba(244,67,54,.1)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: u.w(12), background: RED[600], borderRadius: u.r(12), boxShadow: "0 3px 8px rgba(244,67,54,.3)", display: "flex" }}><Icon name="schedule" size={u.sp(28)} color="#fff" /></div>
        <span style={{ width: u.w(16) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: u.sp(20), fontWeight: 700, color: RED[900], letterSpacing: -0.5 }}>{t("restaurantClosed")}</div>
          <div style={{ height: u.h(4) }} />
          <div style={{ fontSize: u.sp(14), color: RED[800], lineHeight: 1.4 }}>{co.restaurantClosedMessage ?? t("restaurantClosedDescription")}</div>
        </div>
      </div>
      <div style={{ height: u.h(16) }} />
      <div style={{ padding: u.w(16), background: "#fff", borderRadius: u.r(12), border: `1px solid ${RED[200]}` }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon name="access_time" size={u.sp(18)} color={RED[700]} /><span style={{ width: u.w(8) }} />
          <span style={{ fontSize: u.sp(15), fontWeight: 700, color: RED[900] }}>Our Hours</span>
        </div>
        <div style={{ height: u.h(12) }} />
        {hours.map(([d, h]) => (
          <div key={d} style={{ paddingBottom: u.h(8), display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: u.sp(13), color: C.textMedium, fontWeight: 500 }}>{d}</span>
            <span style={{ fontSize: u.sp(13), color: C.textDark, fontWeight: 600 }}>{h}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebCheckoutButton() {
  const { t } = useLanguage();
  const router = useRouter();
  const co = useCheckout();
  const canProceed = isReadyForOrder(co) && canPlaceOrder(co);
  const closing = co.isRestaurantOpen ? getTimeUntilClosing() : null;
  return (
    <div style={{ padding: 28, background: "#fff", borderRadius: 20, border: `1px solid ${grey[200]}`, boxShadow: "0 4px 20px rgba(0,0,0,.06)", boxSizing: "border-box" }}>
      {closing != null && (
        <div style={{ marginBottom: 16, padding: 12, background: ORANGE[50], borderRadius: 10, border: `1px solid ${ORANGE[200]}`, display: "flex", alignItems: "center" }}>
          <Icon name="access_time" size={18} color={ORANGE[700]} /><span style={{ width: 8 }} />
          <span style={{ flex: 1, fontSize: 12, color: ORANGE[900], fontWeight: 600 }}>Closing in {closing} - {t("orderBeforeClosing")}</span>
        </div>
      )}
      <div style={{ height: 56 }}><CustomButton text={t("placeOrder")} onPressed={canProceed ? () => router.push(ROUTES.payment) : undefined} height={56} /></div>
    </div>
  );
}

function BottomBar() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const co = useCheckout();
  const canProceed = isReadyForOrder(co) && canPlaceOrder(co);
  return (
    <div style={{ flex: "none", position: "sticky", bottom: 0, padding: u.w(16), background: "#fff", boxShadow: "0 -2px 10px rgba(0,0,0,.1)", paddingBottom: `calc(${u.w(16)}px + env(safe-area-inset-bottom))` }}>
      {!co.isRestaurantOpen ? (
        <div style={{ padding: u.w(12), marginBottom: u.h(12), background: RED[50], borderRadius: u.r(8), border: `1px solid ${RED[200]}`, display: "flex", alignItems: "center" }}>
          <Icon name="schedule" size={u.sp(20)} color={RED[700]} /><span style={{ width: u.w(10) }} />
          <span style={{ flex: 1, fontSize: u.sp(13), color: RED[900], fontWeight: 500 }}>{co.restaurantClosedMessage ?? "Restaurant is currently closed"}</span>
        </div>
      ) : co.deliveryType === "delivery" && (!canProceed || !canDeliver(co)) ? (
        <div style={{ padding: u.w(12), marginBottom: u.h(12), background: ORANGE[50], borderRadius: u.r(8), border: `1px solid ${ORANGE[200]}`, display: "flex", alignItems: "center" }}>
          <Icon name="warning_amber_rounded" size={u.sp(20)} color={ORANGE[700]} /><span style={{ width: u.w(10) }} />
          <span style={{ flex: 1, fontSize: u.sp(13), color: ORANGE[900], fontWeight: 500 }}>{co.selectedAddress == null ? t("pleaseSelectDeliveryAddress") : t("addressBeyondDeliveryRange")}</span>
        </div>
      ) : null}
      <CustomButton text={t("placeOrder")} onPressed={canProceed ? () => router.push(ROUTES.payment) : undefined} />
    </div>
  );
}
