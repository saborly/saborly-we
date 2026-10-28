"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap, fmt2 } from "@/components/ui/primitives";
import { CustomButton } from "@/components/ui/forms";
import { hideSnack, showSnack } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { addItem, removeItem } from "@/lib/stores/cart";
import { Addon, Extra, FoodItem, MealSize, effectivePriceForPlatform, hasActiveOfferForPlatform, legacyDiscountAmount } from "@/lib/models";
import { consumeExtra, ROUTES } from "@/lib/nav";
import { PLATFORM } from "@/lib/cartActions";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { getFoodItemById } from "@/lib/stores/catalog";

/** Route wrapper: go_router passes the FoodItem as `extra`; on reload (no extra) fall back to GET /food-items/:id */
export function FoodDetailRoute({ id: idProp }: { id?: string } = {}) {
  const params = useSearchParams();
  const id = idProp ?? params.get("id");
  const [item, setItem] = useState<FoodItem | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const extra = consumeExtra<FoodItem>(ROUTES.foodDetail);
    if (extra) { setItem(extra); return; }
    if (!id) { setFailed(true); return; }
    void getFoodItemById(id).then((r) => (r.isSuccess && r.data ? setItem(r.data) : setFailed(true)));
  }, [id]);
  if (item) return <FoodDetailScreen foodItem={item} />;
  return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{failed ? <div>Page not found: /food-detail</div> : <Spinner />}</div>;
}

// Port of lib/features/menu/screens/food_detail_screen.dart + food_detail/widgets/*
export function FoodDetailScreen({ foodItem }: { foodItem: FoodItem }) {
  const u = useScreen();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [current, setCurrent] = useState(foodItem);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<MealSize | null>(foodItem.mealSizes[0] ?? null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [instructions, setInstructions] = useState("");
  const [reloading, setReloading] = useState(false);
  const [fade, setFade] = useState(false);
  const lastLang = useRef(language);
  const large = u.width > 768, desktop = u.width > 1200;

  useEffect(() => { const id = requestAnimationFrame(() => setFade(true)); return () => cancelAnimationFrame(id); }, []);
  // didChangeDependencies: reload the item when the app language changes
  useEffect(() => {
    if (lastLang.current === language) return;
    lastLang.current = language;
    setReloading(true);
    void api.getFoodItem(current.id).then((r) => {
      if (r.isSuccess && r.data) {
        const it = r.data;
        setCurrent(it);
        if (it.mealSizes.length) setSize((prev) => it.mealSizes.find((s) => (s.id ? s.id === prev?.id : !prev?.id && s.additionalPrice === prev?.additionalPrice)) ?? it.mealSizes[0]);
        setExtras((prev) => it.extras.filter((e) => prev.some((p) => p.id === e.id)));
        setAddons((prev) => it.addons.filter((a) => prev.some((p) => p.id === a.id)));
      }
    }).finally(() => setReloading(false));
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasOffer = hasActiveOfferForPlatform(current, PLATFORM);
  const effectivePrice = (() => {
    const base = size && size.additionalPrice > 0 ? size.additionalPrice : current.price;
    return effectivePriceForPlatform(current, PLATFORM) * (base / current.price);
  })();
  const totalPrice = (() => {
    let total = size && size.additionalPrice > 0 ? size.additionalPrice : current.price;
    if (hasOffer) { const disc = effectivePriceForPlatform(current, PLATFORM); total = disc * (total / current.price); }
    if (size && size.additionalPrice < 0) total += size.additionalPrice;
    for (const e of extras) total += e.price;
    for (const a of addons) total += a.price;
    return total * quantity;
  })();

  const addToCart = () => {
    // Dart adds widget.foodItem (the original, not the language-reloaded copy)
    addItem({ foodItem, quantity, selectedMealSize: size, selectedExtras: extras, selectedAddons: addons, specialInstructions: instructions.trim() });
    hideSnack();
    showSnack(t("addedToCart").replace("{itemName}", foodItem.name), {
      bg: C.success, durationMs: 5000, radius: `${u.r(16)}px ${u.r(16)}px 0 0`, action: { label: t("undo"), onClick: () => removeItem(foodItem.id) },
    });
    router.back();
  };

  const content = (
    <Content item={current} large={large} hasOffer={hasOffer} effectivePrice={effectivePrice} quantity={quantity} setQuantity={setQuantity}
      size={size} setSize={setSize} extras={extras} setExtras={setExtras} addons={addons} setAddons={setAddons} instructions={instructions} setInstructions={setInstructions}
      original={foodItem} totalPrice={totalPrice} onAdd={addToCart} />
  );
  const faded = (child: React.ReactNode) => <div style={{ opacity: fade ? 1 : 0, transition: "opacity 800ms ease-in-out" }}>{child}</div>;

  return (
    <div style={large ? { position: "absolute", inset: 0, background: "#F8F9FA" } : { flex: 1, background: "#F8F9FA", position: "relative", minHeight: "100%" }}>
      {large ? (
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ flex: 5, minWidth: 0, position: "relative", boxShadow: "4px 0 20px rgba(0,0,0,.08)" }}>
            <HeroImage item={current} />
            <Tap onClick={() => router.back()} ariaLabel="Back" style={{ position: "absolute", top: u.h(32), left: u.w(32), padding: u.w(12), background: "#fff", borderRadius: u.r(16), boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex" }}>
              <Icon name="arrow_back_rounded" size={u.sp(24)} color={C.textDark} />
            </Tap>
          </div>
          <div style={{ flex: 6, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `${desktop ? u.h(48) : u.h(32)}px ${desktop ? u.w(48) : u.w(32)}px` }}>
              {faded(<div style={{ maxWidth: u.w(680) }}>{content}</div>)}
            </div>
            <DesktopBottomBar desktop={desktop} item={foodItem} quantity={quantity} size={size} hasOffer={hasOffer} totalPrice={totalPrice} onAdd={addToCart} />
          </div>
        </div>
      ) : (
        <MobileScroll item={current}>{faded(content)}</MobileScroll>
      )}
      {reloading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 4, padding: u.w(24), display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}>
            <Spinner /><div style={{ height: u.h(16) }} /><div style={{ fontSize: u.sp(16), fontWeight: 500 }}>{t("loading")}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroImage({ item }: { item: FoodItem }) {
  const u = useScreen();
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F0F0F0" }}>
      {!failed && item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="restaurant_rounded" size={u.sp(80)} color="#BDBDBD" /></div>
      )}
    </div>
  );
}

/** SliverAppBar(expandedHeight 320.h, pinned) with parallax FlexibleSpaceBar */
function MobileScroll({ item, children }: { item: FoodItem; children: React.ReactNode }) {
  const u = useScreen();
  const router = useRouter();
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (!el) return;
    const on = () => setScroll(el.scrollTop);
    on(); el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  const max = u.h(320), min = 56;
  const height = Math.max(min, max - scroll);
  const t = max - min > 0 ? Math.min(Math.max((max - height) / (max - min), 0), 1) : 0;
  const parallax = -(t * (max - min)) / 4;
  return (
    <div>
      <div style={{ height: max }} />
      <div style={{ position: "sticky", top: 0, height: 0, zIndex: 6 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: -max, height, background: "#fff", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: parallax, height: max }}>
            <HeroImage item={item} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,.4) 100%)" }} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, margin: u.w(8), width: 48, height: 48, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tap ariaLabel="Back" onClick={() => router.back()} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow_back_rounded" size={u.sp(22)} color={C.textDark} />
            </Tap>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionTitle({ text, large }: { text: string; large: boolean }) {
  const u = useScreen();
  return <div style={{ fontSize: large ? u.sp(22) : u.sp(20), fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>{text}</div>;
}

function Content(p: {
  item: FoodItem; large: boolean; hasOffer: boolean; effectivePrice: number; quantity: number; setQuantity: (n: number) => void; size: MealSize | null; setSize: (s: MealSize) => void;
  extras: Extra[]; setExtras: (f: (e: Extra[]) => Extra[]) => void; addons: Addon[]; setAddons: (f: (a: Addon[]) => Addon[]) => void; instructions: string; setInstructions: (s: string) => void;
  original: FoodItem; totalPrice: number; onAdd: () => void;
}) {
  const u = useScreen();
  const { t } = useLanguage();
  const { item, large } = p;
  const gap = (n: number) => <div style={{ height: large ? u.h(n) : 0 }} />;
  const box: React.CSSProperties = { background: "#fff", borderRadius: u.r(16), border: `1px solid ${withOpacity(C.border, 0.5)}`, boxShadow: "0 4px 12px rgba(0,0,0,.04)" };
  const sizesRow = large && p.original.mealSizes.length <= 3, extrasRow = large && p.original.extras.length <= 2;
  return (
    <div>
      {/* FoodInfoSection */}
      <div style={{ padding: large ? 0 : `${u.h(24)}px ${u.w(20)}px` }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ padding: u.w(6), borderRadius: u.r(8), background: item.isVeg ? "rgba(76,175,80,.1)" : "rgba(244,67,54,.1)", display: "flex" }}>
            <Icon name={item.isVeg ? "eco_rounded" : "restaurant_rounded"} size={large ? u.sp(18) : u.sp(16)} color={item.isVeg ? "#388E3C" : "#D32F2F"} />
          </div>
          <span style={{ width: u.w(12) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: large ? u.sp(36) : u.sp(28), fontWeight: 700, color: C.textDark, lineHeight: 1.2, letterSpacing: -0.5 }}>{item.name}</div>
            <div style={{ height: u.h(12) }} />
            {item.rating > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", padding: `${u.h(6)}px ${u.w(12)}px`, background: "rgba(255,193,7,.15)", borderRadius: u.r(20) }}>
                <Icon name="star_rounded" size={large ? u.sp(18) : u.sp(16)} color="#FFA000" /><span style={{ width: u.w(6) }} />
                {/* Dart interpolates the double: 4.0 -> "4.0", 4.5 -> "4.5" */}
                <span style={{ fontSize: large ? u.sp(15) : u.sp(13), fontWeight: 600, color: C.textDark }}>{Number.isInteger(item.rating) ? item.rating.toFixed(1) : String(item.rating)}</span><span style={{ width: u.w(4) }} />
                <span style={{ fontSize: large ? u.sp(14) : u.sp(12), color: C.textMedium }}>({item.reviewCount})</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: large ? u.h(20) : u.h(16) }} />
        <div style={{ fontSize: large ? u.sp(17) : u.sp(15), color: C.textMedium, lineHeight: 1.6, letterSpacing: 0.1 }}>{item.description}</div>
        <div style={{ height: large ? u.h(24) : u.h(20) }} />
        <div style={{ display: "flex", alignItems: "center", padding: `${u.h(16)}px ${u.w(20)}px`, borderRadius: u.r(16), background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.1)}, ${withOpacity(C.primary, 0.05)})`, border: `1px solid ${withOpacity(C.primary, 0.2)}` }}>
          <span style={{ fontSize: large ? u.sp(15) : u.sp(13), color: C.textMedium, fontWeight: 500 }}>{t("total")}</span>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            {p.hasOffer && (<><span style={{ fontSize: large ? u.sp(18) : u.sp(16), color: C.textLight, textDecoration: "line-through" }}>{t("currency")}{fmt2(item.price)}</span><div style={{ height: u.h(4) }} /></>)}
            <span style={{ fontSize: large ? u.sp(28) : u.sp(24), fontWeight: 800, color: C.primary, letterSpacing: -0.5 }}>{t("currency")}{fmt2(p.effectivePrice)}</span>
          </div>
        </div>
      </div>
      {gap(40)}
      {/* QuantitySelector */}
      <div style={{ padding: large ? 0 : u.w(20) }}>
        <SectionTitle text={t("quantity")} large={large} />
        <div style={{ height: u.h(16) }} />
        <div style={{ ...box, display: "inline-flex", padding: u.w(4) }}>
          <QtyBtn icon="remove_rounded" enabled={p.quantity > 1} large={large} onTap={() => p.quantity > 1 && p.setQuantity(p.quantity - 1)} />
          <div style={{ width: large ? u.w(90) : u.w(70), display: "flex", alignItems: "center", justifyContent: "center", fontSize: large ? u.sp(22) : u.sp(20), fontWeight: 700, color: C.textDark }}>{p.quantity}</div>
          <QtyBtn icon="add_rounded" enabled large={large} onTap={() => p.setQuantity(p.quantity + 1)} />
        </div>
      </div>
      {item.mealSizes.length > 0 && (<>
        {gap(36)}
        <div style={{ padding: large ? 0 : u.w(20) }}>
          <SectionTitle text={t("mealSize")} large={large} />
          <div style={{ height: u.h(16) }} />
          <div style={{ display: sizesRow ? "flex" : "block" }}>
            {p.original.mealSizes.map((s, i) => {
              const sel = p.size != null && (s.id ? p.size.id === s.id : !p.size.id && p.size.name === s.name && p.size.additionalPrice === s.additionalPrice); // API sizes may carry no id: fall back to name+price so only one shows selected
              return (
                <div key={s.id || `size-${i}`} style={{ flex: 1, paddingBottom: u.h(12), paddingRight: sizesRow ? u.w(12) : 0 }}>
                  <Tap onClick={() => p.setSize(s)} style={{
                    display: "flex", alignItems: "center", padding: `${u.h(12)}px ${u.w(14)}px`, borderRadius: u.r(14), transition: "all 250ms ease-in-out", boxSizing: "border-box",
                    background: sel ? withOpacity(C.primary, 0.1) : "#FAFAFA", border: `2px solid ${sel ? C.border : "#E0E0E0"}`, boxShadow: sel ? `0 3px 6px ${withOpacity(C.border, 0.2)}` : "none",
                  }}>
                    <span style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <span style={{ width: 20, height: 20, boxSizing: "border-box", borderRadius: "50%", border: `2px solid ${sel ? C.success : "rgba(0,0,0,.54)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sel && <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.success }} />}
                      </span>
                    </span>
                    <span style={{ width: u.w(12) }} />
                    <span style={{ flex: 1, fontSize: u.sp(16), fontWeight: sel ? 700 : 500, color: sel ? C.primary : C.textDark }}>{s.name}</span>
                    {s.additionalPrice !== 0 && (
                      <span style={{ padding: `${u.h(6)}px ${u.w(10)}px`, borderRadius: u.r(8), background: sel ? C.primary : "#EEEEEE", fontSize: u.sp(14), fontWeight: 600, color: sel ? "#fff" : C.primary }}>
                        {s.additionalPrice > 0 ? "+" : ""}{t("currency")}{fmt2(Math.abs(s.additionalPrice))}
                      </span>
                    )}
                  </Tap>
                </div>
              );
            })}
          </div>
        </div>
      </>)}
      {item.extras.length > 0 && (<>
        {gap(36)}
        <div style={{ padding: large ? 0 : u.w(20) }}>
          <SectionTitle text={t("extras")} large={large} />
          <div style={{ height: u.h(16) }} />
          <div style={{ display: extrasRow ? "flex" : "block" }}>
            {p.original.extras.map((e, i) => {
              const sel = p.extras.some((x) => x.id === e.id);
              return (
                <div key={e.id || `extra-${i}`} style={{ flex: 1, paddingRight: extrasRow ? u.w(12) : 0 }}>
                  <Tap onClick={() => p.setExtras((cur) => (cur.some((x) => x.id === e.id) ? cur.filter((x) => x.id !== e.id) : [...cur, e]))} style={{
                    marginBottom: u.h(12), padding: large ? u.w(20) : u.w(18), display: "flex", alignItems: "center", boxSizing: "border-box", transition: "all 200ms", borderRadius: large ? u.r(16) : u.r(14),
                    background: sel ? withOpacity(C.primary, 0.08) : "#fff", border: `${sel ? 2 : 1}px solid ${sel ? C.primary : withOpacity(C.border, 0.5)}`,
                    boxShadow: sel ? `0 4px 12px ${withOpacity(C.primary, 0.15)}` : "0 2px 8px rgba(0,0,0,.04)",
                  }}>
                    <span style={{ width: u.w(24), height: u.h(24), boxSizing: "border-box", borderRadius: u.r(6), border: `2px solid ${sel ? C.primary : "#BDBDBD"}`, background: sel ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      {sel && <Icon name="check_rounded" size={u.sp(16)} color="#fff" />}
                    </span>
                    <span style={{ width: u.w(14) }} />
                    <span style={{ flex: 1, fontSize: large ? u.sp(17) : u.sp(16), fontWeight: sel ? 600 : 500, color: C.textDark }}>{e.name}</span>
                    <span style={{ padding: `${u.h(6)}px ${u.w(12)}px`, borderRadius: u.r(8), background: sel ? C.primary : withOpacity(C.primary, 0.1), fontSize: large ? u.sp(15) : u.sp(14), fontWeight: 700, color: sel ? "#fff" : C.primary }}>{t("currency")}{fmt2(e.price)}</span>
                  </Tap>
                </div>
              );
            })}
          </div>
        </div>
      </>)}
      {item.addons.length > 0 && (<>
        {gap(36)}
        <div style={{ paddingLeft: large ? 0 : u.w(20) }}>
          <div style={{ paddingRight: large ? 0 : u.w(20) }}><SectionTitle text={t("addons")} large={large} /></div>
          <div style={{ height: u.h(16) }} />
          <div className="hide-scrollbar" style={{ display: "flex", overflowX: "auto", height: large ? u.h(300) : u.h(190), paddingRight: large ? 0 : u.w(20) }}>
            {p.original.addons.map((a, i) => <AddonCard key={a.id || `addon-${i}`} addon={a} selected={p.addons.some((x) => x.id === a.id)} large={large} onToggle={() => p.setAddons((cur) => (cur.some((x) => x.id === a.id) ? cur.filter((x) => x.id !== a.id) : [...cur, a]))} />)}
          </div>
        </div>
      </>)}
      {gap(36)}
      <div style={{ padding: large ? 0 : u.w(20) }}>
        <SectionTitle text={t("specialInstructions")} large={large} />
        <div style={{ height: u.h(16) }} />
        <div style={box}>
          <textarea rows={4} value={p.instructions} onChange={(e) => p.setInstructions(e.target.value)} placeholder={t("specialInstructions")}
            style={{ width: "100%", boxSizing: "border-box", border: 0, outline: 0, background: "transparent", resize: "none", padding: u.w(18), fontSize: large ? u.sp(16) : u.sp(14), color: C.textDark, fontFamily: "inherit", borderRadius: u.r(16), display: "block" }} />
        </div>
      </div>
      <div style={{ height: large ? u.h(120) : u.h(16) }} />
      {!large && <MobileBottomBar item={p.original} quantity={p.quantity} size={p.size} totalPrice={p.totalPrice} onAdd={p.onAdd} />}
      {!large && <div style={{ height: u.h(24) }} />}
    </div>
  );
}

function QtyBtn({ icon, enabled, large, onTap }: { icon: string; enabled: boolean; large: boolean; onTap: () => void }) {
  const u = useScreen();
  return (
    <Tap disabled={!enabled} onClick={onTap} style={{ width: large ? u.w(52) : u.w(44), height: large ? u.h(52) : u.h(44), borderRadius: u.r(12), background: enabled ? C.primary : "#EEEEEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={large ? u.sp(24) : u.sp(22)} color={enabled ? "#fff" : "#BDBDBD"} />
    </Tap>
  );
}

function AddonCard({ addon, selected, large, onToggle }: { addon: Addon; selected: boolean; large: boolean; onToggle: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const imgH = large ? u.h(140) : u.h(100);
  return (
    <Tap onClick={onToggle} style={{
      width: large ? u.w(220) : u.w(160), marginRight: u.w(12), flex: "none", display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", borderRadius: u.r(16), transition: "all 200ms",
      border: `${selected ? 2 : 1}px solid ${selected ? C.primary : withOpacity(C.border, 0.5)}`, boxShadow: `0 4px 12px ${selected ? withOpacity(C.primary, 0.15) : "rgba(0,0,0,.04)"}`,
    }}>
      {addon.imageUrl && (
        <div style={{ height: imgH, borderRadius: `${u.r(14)}px ${u.r(14)}px 0 0`, overflow: "hidden", background: "#F0F0F0", flex: "none" }}>
          {failed ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="fastfood_rounded" size={u.sp(40)} color="#BDBDBD" /></div>
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={addon.imageUrl} alt="" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
      )}
      <div style={{ flex: 1, padding: u.w(14), display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <span style={{ flex: 1, fontSize: large ? u.sp(16) : u.sp(14), fontWeight: 600, color: C.textDark, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{addon.name}</span>
          {selected && <span style={{ padding: u.w(4), background: C.primary, borderRadius: "50%", display: "flex" }}><Icon name="check_rounded" size={u.sp(14)} color="#fff" /></span>}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ alignSelf: "flex-start", padding: `${u.h(6)}px ${u.w(10)}px`, borderRadius: u.r(8), background: withOpacity(C.primary, 0.1), fontSize: large ? u.sp(15) : u.sp(13), fontWeight: 700, color: C.primary }}>{t("currency")}{fmt2(addon.price)}</span>
      </div>
    </Tap>
  );
}

function PriceLine({ item, quantity, size, hasOffer, totalPrice, big }: { item: FoodItem; quantity: number; size: MealSize | null; hasOffer: boolean; totalPrice: number; big: number }) {
  const u = useScreen();
  const { t } = useLanguage();
  const strike = (txt: string) => <><span style={{ fontSize: u.sp(16), color: C.textLight, textDecoration: "line-through" }}>{t("currency")}{txt}</span><span style={{ width: u.w(8) }} /></>;
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      {hasOffer && (!size || (size.additionalPrice ?? 0) <= 0) && strike(fmt2(quantity * item.price))}
      {hasOffer && size && size.additionalPrice > 0 && strike(fmt2(quantity * size.additionalPrice))}
      <span style={{ fontSize: u.sp(big), fontWeight: 800, color: C.textDark, letterSpacing: -0.5 }}>{t("currency")}{fmt2(totalPrice)}</span>
    </div>
  );
}

function DesktopBottomBar({ desktop, item, quantity, size, hasOffer, totalPrice, onAdd }: { desktop: boolean; item: FoodItem; quantity: number; size: MealSize | null; hasOffer: boolean; totalPrice: number; onAdd: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ background: "#fff", padding: `${u.h(24)}px ${desktop ? u.w(48) : u.w(32)}px`, boxShadow: "0 -4px 20px rgba(0,0,0,.08)", flex: "none" }}>
      <div style={{ maxWidth: u.w(680), margin: "0 auto", display: "flex", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: u.sp(14), color: C.textMedium, fontWeight: 500 }}>{t("totalAmount")}</div>
          <div style={{ height: u.h(4) }} />
          <PriceLine item={item} quantity={quantity} size={size} hasOffer={hasOffer} totalPrice={totalPrice} big={28} />
        </div>
        <span style={{ width: u.w(24) }} />
        <div style={{ flex: 1 }}><CustomButton text={t("addToCart")} onPressed={onAdd} height={u.h(56)} /></div>
      </div>
    </div>
  );
}

function MobileBottomBar({ item, quantity, size, totalPrice, onAdd }: { item: FoodItem; quantity: number; size: MealSize | null; totalPrice: number; onAdd: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  // MobileBottomBar uses the deprecated, platform-less foodItem.hasActiveOffer
  const hasOffer = !!item.offer && legacyDiscountAmount(item) > 0;
  return (
    <div style={{ padding: u.w(20), background: "#fff", borderRadius: `${u.r(24)}px ${u.r(24)}px 0 0`, boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}>
      <div style={{ fontSize: u.sp(13), color: C.textMedium, fontWeight: 500 }}>Total Amount</div>
      <div style={{ height: u.h(4) }} />
      <PriceLine item={item} quantity={quantity} size={size} hasOffer={hasOffer} totalPrice={totalPrice} big={24} />
      <div style={{ height: u.h(16) }} />
      <CustomButton text={t("addToCart")} onPressed={onAdd} height={u.h(54)} />
    </div>
  );
}
