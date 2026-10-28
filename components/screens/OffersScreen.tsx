"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, fmt2 } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { showSnack } from "@/components/ui/Toast";
import { FoodItemCard } from "@/components/cards/FoodItemCard";
import { FoodKingFooter } from "@/components/home/more";
import { FoodItem } from "@/lib/models";
import { FoodItemWithOffer, OfferModel } from "@/lib/offerModels";
import { ROUTES, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import { addItem } from "@/lib/stores/cart";
import { loadOffers, setOffersLanguage, useOffers } from "@/lib/stores/offers";
import { useLanguage } from "@/lib/stores/language";

const poppins = "var(--font-poppins), sans-serif";

// OffersResponsive
const isMobileW = (w: number) => w < 600;
const isTabletW = (w: number) => w >= 600 && w < 1000;
const maxContentWidth = (w: number) => (w >= 1400 ? 1280 : w >= 1000 ? w * 0.88 : w);
const crossAxisCount = (w: number) => (w < 500 ? 1 : w < 800 ? 3 : w < 1200 ? 4 : 5);
const childAspectRatio = (w: number) => (isMobileW(w) ? 1.1 : isTabletW(w) ? 0.75 : 0.78);

function ExpiryBadge({ offer }: { offer: OfferModel }) {
  const u = useScreen();
  const { t } = useLanguage();
  const daysLeft = Math.trunc((offer.expiryDate!.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return null;
  return (
    <div style={{ position: "absolute", top: u.h(12), left: u.w(16), padding: `${u.h(4)}px ${u.w(8)}px`, background: "rgba(255,255,255,.9)", borderRadius: u.r(8), display: "flex", alignItems: "center" }}>
      <Icon name="access_time" size={u.sp(12)} color={C.primary} /><span style={{ width: u.w(4) }} />
      <span style={{ fontSize: u.sp(10), fontWeight: 600, color: C.textDark }}>{daysLeft === 0 ? t("today") : t("days").replace("{days}", String(daysLeft))}</span>
    </div>
  );
}

function OfferBannerCard({ offer }: { offer: OfferModel }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [imgState, setImgState] = useState<"loading" | "ok" | "error">("loading");
  const price = offer.comboPrice ?? offer.value ?? 0;
  const addCombo = () => {
    const synthetic: FoodItem = {
      id: offer.id, name: offer.title, description: offer.description, price, imageUrl: offer.imageUrl ?? "", category: "combo",
      isVeg: false, isFeatured: false, isPopular: false, rating: 0, reviewCount: 0, offer: null, tags: [], mealSizes: [], extras: [], addons: [],
      availabilityStatus: "in-stock",
    };
    addItem({ foodItem: synthetic });
    showSnack(<span style={{ fontFamily: poppins, fontSize: u.sp(13), fontWeight: 400, color: "#fff" }}>{t("addedToCart").replace("{itemName}", offer.title)}</span>, {
      bg: C.primary, radius: `${u.r(10)}px`, durationMs: 2000,
    });
  };
  return (
    <div style={{ position: "relative", height: "100%", background: `linear-gradient(135deg, ${offer.gradientColors[0]}, ${offer.gradientColors[1]})`, borderRadius: u.r(16), boxShadow: `0 4px 10px ${withOpacity(offer.gradientColors[0], 0.3)}` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: u.r(16), overflow: "hidden" }}>
        {offer.imageUrl && imgState !== "error" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.imageUrl} alt="" onLoad={() => setImgState("ok")} onError={() => setImgState("error")} style={{ width: "100%", height: "100%", objectFit: "contain", display: imgState === "ok" ? "block" : "none" }} />
        )}
        {offer.imageUrl && imgState === "loading" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>}
      </div>
      {offer.expiryDate && <ExpiryBadge offer={offer} />}
      <div onClick={addCombo} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `${u.h(12)}px ${u.w(20)}px`, background: C.primary, borderRadius: `0 0 ${u.r(16)}px ${u.r(16)}px`, display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}>
        <Icon name="shopping_cart_rounded" size={u.sp(18)} color="#fff" /><span style={{ width: u.w(8) }} />
        <span style={{ fontFamily: poppins, fontSize: u.sp(14), fontWeight: 700, color: "#fff" }}>{price > 0 ? `Order Now — €${fmt2(price)}` : "Order Now"}</span>
      </div>
    </div>
  );
}

function toFoodItem(item: FoodItemWithOffer): FoodItem {
  return {
    id: item.id, name: item.name, description: item.description, price: item.price, imageUrl: item.imageUrl, category: item.category.id,
    isVeg: false, offer: item.offer, isFeatured: false, isPopular: false, rating: 0, reviewCount: 0, tags: [], mealSizes: [], extras: [], addons: [],
    availabilityStatus: "in-stock",
  };
}

// Port of lib/features/menu/screens/offersScreen.dart (+ offers/widgets/*)
export function OffersScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t, language } = useLanguage();
  const offers = useOffers();
  const [langLoading, setLangLoading] = useState(false);
  const first = useRef(true);
  const sw = u.width;
  const isWeb = sw >= 1024, mobile = isMobileW(sw), tablet = isTabletW(sw);
  const maxW = maxContentWidth(sw);
  const hpad = mobile ? u.w(16) : tablet ? u.w(32) : u.w(48);

  useEffect(() => { setOffersLanguage(language); void loadOffers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setLangLoading(true);
    setOffersLanguage(language);
    loadOffers().catch(() => {}).finally(() => setLangLoading(false));
  }, [language]);

  if ((offers.isLoading && offers.itemsWithOffers.length === 0) || langLoading) {
    return (
      <div style={{ flex: 1, background: "#FAFAFA", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", position: "relative" }}>
        <Spinner stroke={3} />
        <div style={{ height: u.h(16) }} />
        <div style={{ fontFamily: poppins, fontSize: u.sp(14), color: C.textLight }}>{t("loadingOffers")}</div>
        {langLoading && <LanguageOverlay />}
      </div>
    );
  }

  const hasItems = offers.itemsWithOffers.length > 0, hasAll = offers.allOffers.length > 0;
  const gap = mobile ? u.w(12) : tablet ? u.w(16) : u.w(20);
  const vgap = mobile ? u.h(12) : tablet ? u.h(16) : u.h(20);
  const grid = (n: number, cols: number, ratio: number, step: number, render: (i: number) => React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gap, rowGap: vgap }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid-pop" style={{ aspectRatio: String(ratio), animationDuration: `${300 + i * step}ms` }}>{render(i)}</div>
      ))}
    </div>
  );

  return (
    <div style={{ flex: 1, background: "#FAFAFA", width: "100%", position: "relative" }}>
      {!isWeb && (
        <div style={{ position: "sticky", top: 0, zIndex: 20, height: 56, background: "#fff", display: "flex", alignItems: "center", borderBottom: "1px solid transparent", backgroundImage: "linear-gradient(#fff,#fff), linear-gradient(90deg, transparent, #EEEEEE, transparent)", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
          <div onClick={() => { if (window.history.length > 1) router.back(); else router.push(ROUTES.home); }} style={{ margin: u.r(8), width: 40, height: 40, background: "#F5F5F5", borderRadius: u.r(12), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
            <Icon name="arrow_back_ios_new_rounded" size={u.sp(20)} color={C.textDark} />
          </div>
          <span style={{ marginLeft: 16, fontFamily: poppins, fontSize: mobile ? u.sp(18) : u.sp(22), fontWeight: 600, color: C.textDark }}>{t("specialOffers")}</span>
        </div>
      )}
      <div style={{ background: "linear-gradient(180deg, #fff, #FAFAFA)", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: maxW, padding: `0 ${hpad}px`, boxSizing: "border-box" }}>
          <div style={{ height: mobile ? u.h(20) : u.h(40) }} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: mobile ? sw * 0.7 : u.w(360), padding: `${mobile ? u.h(18) : u.h(22)}px ${u.w(24)}px`, background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.12)}, ${withOpacity(C.primary, 0.04)})`, borderRadius: u.r(20), border: `1px solid ${withOpacity(C.primary, 0.2)}`, boxShadow: `0 6px 16px ${withOpacity(C.primary, 0.08)}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
              <div style={{ padding: u.r(10), background: C.primary, borderRadius: "50%", boxShadow: `0 4px 10px ${withOpacity(C.primary, 0.3)}`, display: "flex" }}><Icon name="local_fire_department_rounded" size={mobile ? u.sp(20) : u.sp(24)} color="#fff" /></div>
              <span style={{ width: u.w(16) }} />
              <div style={{ padding: u.r(10), background: "#fff", borderRadius: "50%", boxShadow: "0 4px 10px rgba(0,0,0,.08)", display: "flex" }}><Icon name="local_offer_rounded" size={mobile ? u.sp(20) : u.sp(24)} color={C.primary} /></div>
              <span style={{ width: u.w(16) }} />
              <div style={{ padding: u.r(10), background: withOpacity(C.primary, 0.1), borderRadius: "50%", display: "flex" }}><Icon name="shopping_bag_rounded" size={mobile ? u.sp(20) : u.sp(24)} color={C.primary} /></div>
            </div>
          </div>
          <div style={{ height: mobile ? u.h(24) : u.h(40) }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: maxW, padding: `0 ${hpad}px`, boxSizing: "border-box", animation: "fadeIn 800ms ease-in-out both" }}>
          {!hasItems && !hasAll ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ margin: `${u.h(60)}px ${mobile ? u.w(24) : u.w(48)}px`, padding: mobile ? u.r(40) : u.r(60), background: "#fff", borderRadius: u.r(24), boxShadow: "0 10px 20px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ padding: u.r(24), background: withOpacity(C.primary, 0.1), borderRadius: "50%", display: "flex" }}><Icon name="local_offer_outlined" size={mobile ? u.sp(64) : u.sp(80)} color={C.primary} /></div>
                <div style={{ height: mobile ? u.h(24) : u.h(32) }} />
                <div style={{ fontFamily: poppins, fontSize: mobile ? u.sp(20) : u.sp(24), fontWeight: 700, color: C.textDark }}>{t("noOffersAvailable")}</div>
                <div style={{ height: u.h(12) }} />
                <div style={{ fontFamily: poppins, textAlign: "center", fontSize: mobile ? u.sp(14) : u.sp(16), color: C.textLight, lineHeight: 1.6 }}>{t("checkBackLaterOffers")}</div>
                <div style={{ height: u.h(32) }} />
                <MButton onClick={() => router.push(ROUTES.home)} padding={[u.h(16), u.w(32)]} radius={u.r(12)}>
                  <Icon name="home_rounded" size={u.sp(20)} color="#fff" /><span style={{ width: 8 }} />
                  <span style={{ fontFamily: poppins, fontSize: u.sp(15), fontWeight: 600 }}>{t("browseMenu")}</span>
                </MButton>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: mobile ? u.h(12) : u.h(20), paddingBottom: mobile ? u.h(100) : u.h(120) }}>
              {hasAll && (
                <>
                  {grid(offers.allOffers.length, mobile ? 1 : 2, mobile ? 2.2 : 2.5, 80, (i) => <OfferBannerCard offer={offers.allOffers[i]} />)}
                  {hasItems && <div style={{ height: mobile ? u.h(24) : u.h(32) }} />}
                </>
              )}
              {hasItems && grid(offers.itemsWithOffers.length, crossAxisCount(sw), childAspectRatio(sw), 50, (i) => {
                const fi = toFoodItem(offers.itemsWithOffers[i]);
                return <FoodItemCard foodItem={fi} showDescription onTap={() => { setExtra(ROUTES.foodDetail, fi); router.push(foodHref(fi)); }} />;
              })}
            </div>
          )}
        </div>
      </div>
      {isWeb && <FoodKingFooter />}
    </div>
  );
}

function LanguageOverlay() {
  const u = useScreen();
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
      <div style={{ padding: u.r(24), background: "#fff", borderRadius: u.r(16), boxShadow: "0 10px 20px rgba(0,0,0,.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Spinner stroke={3} />
        <div style={{ height: u.h(16) }} />
        <div style={{ fontFamily: poppins, fontSize: u.sp(14), fontWeight: 500, color: C.textDark }}>Changing language...</div>
      </div>
    </div>
  );
}
