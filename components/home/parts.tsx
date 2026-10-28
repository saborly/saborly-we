"use client";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { NetImage } from "@/components/ui/NetImage";
import { Tap, clamp, fmt2 } from "@/components/ui/primitives";
import { useBox } from "@/components/ui/useBox";
import { PLATFORM, addPlainItemToCart, needsCustomization } from "@/lib/cartActions";
import { hashIndex } from "@/lib/dart";
import { loadGooglePlaces, googleRatingSummary, GooglePlaceSummary } from "@/lib/googlePlaces";
import { FoodCategory, FoodItem, discountPercentageForPlatform, effectivePriceForPlatform, hasActiveOfferForPlatform } from "@/lib/models";
import { ROUTES, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";

const BREE = "var(--font-bree), serif";
export const display = (size: number, color: string, height = 1.08, u?: { size: (n: number) => number }): CSSProperties =>
  ({ fontFamily: BREE, fontSize: u ? u.size(size) : size, color, lineHeight: height, letterSpacing: -0.5, fontWeight: 400 });
export const heading = (size: number, color: string, height = 1.2, u?: { size: (n: number) => number }): CSSProperties =>
  ({ fontFamily: BREE, fontSize: u ? u.size(size) : size, color, lineHeight: height, letterSpacing: -0.3, fontWeight: 400 });
export const body = (size: number, o: { color?: string; weight?: number; height?: number } = {}, u?: { size: (n: number) => number }): CSSProperties =>
  ({ fontSize: u ? u.size(size) : size, fontWeight: o.weight ?? 500, color: o.color, lineHeight: o.height ?? 1.5 });

// ---------------- SectionHeader ----------------
export function SectionHeader({ title, kicker, isWeb, onViewAll }: { title: string; kicker?: string; isWeb: boolean; onViewAll?: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker != null && (<>
          <div style={{ fontSize: u.size(isWeb ? 12.5 : 11.5), fontWeight: 800, color: C.primary, letterSpacing: 1.4 }}>{kicker.toUpperCase()}</div>
          <div style={{ height: u.h(isWeb ? 6 : 4) }} />
        </>)}
        <div style={{ ...heading(isWeb ? 30 : 22, C.textDark, 1.15, u), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</div>
      </div>
      {onViewAll && (<>
        <span style={{ width: u.w(12) }} />
        <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <Tap onClick={onViewAll} style={{
            display: "flex", alignItems: "center", padding: `${isWeb ? 10 : 7}px ${isWeb ? 16 : 12}px`, borderRadius: 999, transition: "background 160ms",
            background: hover ? C.primary : withOpacity(C.primary, 0.08),
          }}>
            <span style={{ ...body(isWeb ? 14 : 13, { color: hover ? "#fff" : C.primary, weight: 800, height: 1.2 }, u), whiteSpace: "nowrap" }}>{t("viewAll")}</span>
            <span style={{ width: 6 }} />
            <Icon name="arrow_forward_rounded" size={u.size(isWeb ? 16 : 15)} color={hover ? "#fff" : C.primary} />
          </Tap>
        </div>
      </>)}
    </div>
  );
}

// ---------------- ShowcaseShell ----------------
export function ShowcaseShell({ children }: { children: ReactNode }) {
  const u = useScreen();
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", padding: `${u.h(22)}px ${u.w(20)}px`, background: C.surface, borderRadius: 24,
      border: `1px solid ${withOpacity(C.border, 0.55)}`, boxShadow: `0 6px 18px ${withOpacity("#1A0803", 0.06)}`,
    }}>{children}</div>
  );
}

// ---------------- Categories ----------------
const CARD_SCHEMES: [string, string][] = [
  ["#D84E17", "#F5A623"], ["#6A1638", "#E76F51"], ["#2F7A53", "#6FBC8E"], ["#7B2F17", "#DB8A36"],
  ["#AA5C28", "#F2B15E"], ["#B23A48", "#F28482"], ["#4A2C21", "#B56A2D"], ["#E07A1F", "#F2CC8F"],
];
const MOBILE_SCHEMES: [string, string][] = CARD_SCHEMES.slice(0, 6);

export function FoodCategoryCard({ category, onTap, boxHeight }: { category: FoodCategory; onTap: () => void; boxHeight: number }) {
  const u = useScreen();
  const webish = u.width > 600; // _isWeb in the card
  const scheme = CARD_SCHEMES[hashIndex(category.name, CARD_SCHEMES.length)];
  const cardWidth = webish ? u.w(120) : u.w(100);
  const baseIcon = webish ? u.w(90) : u.w(80);
  const fontSize = webish ? u.sp(14) : u.sp(13);
  let iconSize = baseIcon, spacing = u.h(12), textMax = u.h(40), lines = 2;
  const desired = iconSize + spacing + textMax;
  if (boxHeight > 0 && desired > boxHeight) {
    const scale = clamp(boxHeight / desired, 0.55, 1);
    iconSize *= scale; spacing *= scale; textMax *= scale;
    if (scale < 0.75) lines = 1;
  }
  const avatarRadius = clamp(u.r(30) * (iconSize / baseIcon), u.r(16), u.r(30));
  return (
    <Tap onClick={onTap} style={{ width: cardWidth, marginRight: webish ? u.w(20) : u.w(16), flex: "none" }}>
      <div style={{
        width: iconSize, height: iconSize, margin: "0 auto", borderRadius: avatarRadius, overflow: "hidden", position: "relative",
        background: `linear-gradient(135deg, ${scheme[0]}, ${scheme[1]})`, boxShadow: `0 8px 16px -4px ${withOpacity(scheme[0], 0.28)}`,
      }}>
        {category.imageUrl.startsWith("http") ? (
          <NetImage src={category.imageUrl} placeholder={<Fallback category={category} size={iconSize} webish={webish} />}
            error={<Fallback category={category} size={iconSize} webish={webish} />} />
        ) : <Fallback category={category} size={iconSize} webish={webish} />}
      </div>
      <div style={{ height: spacing }} />
      <div style={{
        maxHeight: textMax, overflow: "hidden", textAlign: "center", fontSize, fontWeight: 800, color: C.textDark, lineHeight: 1.15, letterSpacing: -0.3,
        display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical",
      }}>{category.name}</div>
    </Tap>
  );
}
function Fallback({ category, size, webish }: { category: FoodCategory; size: number; webish: boolean }) {
  const u = useScreen();
  return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: webish ? u.sp(36) : u.sp(32), color: "#fff", fontWeight: 500 }}>{category.icon}</div>;
}

export function CategoriesSlider({ categories, isWeb, clearSearch }: { categories: FoodCategory[]; isWeb: boolean; clearSearch: () => void }) {
  const u = useScreen();
  const router = useRouter();
  if (!categories.length) return null;
  const height = isWeb ? u.h(140) : u.h(122);
  return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="hide-scrollbar" style={{ display: "flex", alignItems: "center", maxWidth: "100%", overflowX: "auto", height: "100%" }}>
        {categories.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <FoodCategoryCard category={c} boxHeight={height} onTap={() => { clearSearch(); setExtra(ROUTES.menu, { category: c.id }); router.push(ROUTES.menu); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MobileCategoriesSection({ categories, onTap }: { categories: FoodCategory[]; onTap: (c: FoodCategory) => void }) {
  const u = useScreen();
  if (!categories.length) return null;
  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: `${u.h(16)}px ${u.w(14)}px`, background: "#fff", borderRadius: u.r(24), boxShadow: `0 6px 16px ${withOpacity("#1A0803", 0.08)}` }}>
      <div className="hide-scrollbar" style={{ display: "flex", overflowX: "auto" }}>
        {categories.map((c, i) => <MobileChip key={c.id} category={c} first={i === 0} onTap={() => onTap(c)} />)}
      </div>
    </div>
  );
}
function MobileChip({ category, first, onTap }: { category: FoodCategory; first: boolean; onTap: () => void }) {
  const u = useScreen();
  const [pressed, setPressed] = useState(false);
  const scheme = MOBILE_SCHEMES[hashIndex(category.name, MOBILE_SCHEMES.length)];
  const avatar = u.w(68);
  const fb = (
    <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: u.sp(24),
      background: `linear-gradient(135deg, ${scheme[0]}, ${scheme[1]})` }}>{category.icon}</div>
  );
  return (
    <div style={{ marginLeft: first ? 0 : u.w(8), flex: "none" }}>
      <div onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}>
        <Tap onClick={onTap} style={{ width: u.w(88), transform: pressed ? "scale(.94)" : "scale(1)", transition: "transform 120ms" }}>
          <div style={{ width: avatar, height: avatar, margin: "0 auto", padding: u.w(2.5), boxSizing: "border-box", borderRadius: "50%", background: `linear-gradient(135deg, ${scheme[0]}, ${scheme[1]})` }}>
            <div style={{ width: "100%", height: "100%", padding: u.w(2), boxSizing: "border-box", borderRadius: "50%", background: "#fff" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
                {category.imageUrl.startsWith("http") ? <NetImage src={category.imageUrl} placeholder={fb} error={fb} /> : fb}
              </div>
            </div>
          </div>
          <div style={{ height: u.h(8) }} />
          <div style={{ textAlign: "center", fontSize: u.sp(11.5), fontWeight: 700, color: C.textDark, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{category.name}</div>
        </Tap>
      </div>
    </div>
  );
}

// ---------------- Dishes (WebPopularDishesSection) ----------------
export type DishLayout = "grid" | "list" | "carousel";

function DishPrice({ item, size }: { item: FoodItem; size: number }) {
  const u = useScreen();
  const { t } = useLanguage();
  const discounted = hasActiveOfferForPlatform(item, PLATFORM);
  const eff = effectivePriceForPlatform(item, PLATFORM);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", columnGap: 6 }}>
      <span style={{ ...body(size, { color: C.primaryDark, weight: 800, height: 1.1 }, u) }}>{t("currency")}{fmt2(eff)}</span>
      {discounted && <span style={{ ...body(size * 0.72, { color: C.textLight, weight: 600, height: 1.3 }, u), textDecoration: "line-through" }}>{t("currency")}{fmt2(item.price)}</span>}
    </div>
  );
}
function DishBadge({ item }: { item: FoodItem }) {
  const u = useScreen();
  const { t } = useLanguage();
  let icon: string, label: string, bg: string, iconColor = "#fff";
  if (hasActiveOfferForPlatform(item, PLATFORM)) { icon = "local_offer_rounded"; label = `-${discountPercentageForPlatform(item, PLATFORM)}%`; bg = C.primary; }
  else if (item.rating > 0) { icon = "star_rounded"; label = item.rating.toFixed(1); bg = "rgba(0,0,0,.6)"; iconColor = C.secondary; }
  else if (item.isVeg) { icon = "eco_rounded"; label = t("homeVeg"); bg = C.accentLeaf; }
  else return null;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", background: bg, borderRadius: 999 }}>
      <Icon name={icon} size={u.size(11)} color={iconColor} />
      <span style={{ width: 3 }} />
      <span style={{ ...body(10.5, { color: "#fff", weight: 800, height: 1.2 }, u) }}>{label}</span>
    </div>
  );
}
function DishImage({ item }: { item: FoodItem }) {
  const ph = (
    <div style={{ width: "100%", height: "100%", background: C.accentSand, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="restaurant_rounded" size={28} color={C.textHint} />
    </div>
  );
  if (!item.imageUrl) return ph;
  return <NetImage src={item.imageUrl} error={ph} />;
}
function useAdded() {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const flash = () => { setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 900); };
  return { added, flash };
}
function addDish(item: FoodItem, onTap: () => void, onAdded: () => void) {
  if (needsCustomization(item)) { onTap(); return; }
  addPlainItemToCart(item, "dish");
  onAdded();
}

function DishCard({ item, onTap }: { item: FoodItem; onTap: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [hover, setHover] = useState(false);
  const { added, flash } = useAdded();
  const radius = 20;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onTap} style={{
      height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", cursor: "pointer", background: C.surface, borderRadius: radius,
      border: `1px solid ${withOpacity(C.border, hover ? 0.9 : 0.5)}`, transition: "transform 220ms ease-out, box-shadow 220ms ease-out, border-color 220ms",
      transform: `translateY(${hover ? -4 : 0}px)`, boxShadow: `0 ${hover ? 10 : 4}px ${hover ? 22 : 12}px ${withOpacity("#1A0803", hover ? 0.16 : 0.06)}`,
    }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", borderRadius: `${radius - 1}px ${radius - 1}px 0 0` }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${hover ? 1.06 : 1})`, transition: "transform 300ms ease-out" }}><DishImage item={item} /></div>
        <div style={{ position: "absolute", left: 10, top: 10 }}><DishBadge item={item} /></div>
      </div>
      <div style={{ padding: "12px 12px 12px 14px" }}>
        <div style={{ ...body(14.5, { color: C.textDark, weight: 800, height: 1.3 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
        {item.description && (<>
          <div style={{ height: 2 }} />
          <div style={{ ...body(12, { color: C.muted, height: 1.35 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>
        </>)}
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}><DishPrice item={item} size={15.5} /></div>
          <Tap ariaLabel={added ? t("homeAdded") : t("add")} onClick={(e) => { e.stopPropagation(); addDish(item, onTap, flash); }} style={{
            width: 34, height: 34, borderRadius: "50%", background: added ? C.accentLeaf : C.primary, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 3px 8px ${withOpacity(C.primary, 0.25)}`, transition: "background 180ms", flex: "none",
          }}><Icon name={added ? "check_rounded" : "add_rounded"} size={19} color="#fff" /></Tap>
        </div>
      </div>
    </div>
  );
}

function DishCardHorizontal({ item, onTap }: { item: FoodItem; onTap: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const { added, flash } = useAdded();
  const imageSize = 104;
  return (
    <div onClick={onTap} style={{
      padding: 10, borderRadius: 20, background: C.surface, border: `1px solid ${withOpacity(C.border, 0.5)}`, boxShadow: `0 4px 12px ${withOpacity("#1A0803", 0.05)}`,
      display: "flex", cursor: "pointer", boxSizing: "border-box",
    }}>
      <div style={{ width: imageSize, height: imageSize, position: "relative", borderRadius: 14, overflow: "hidden", flex: "none" }}>
        <DishImage item={item} />
        <div style={{ position: "absolute", left: 6, top: 6 }}><DishBadge item={item} /></div>
      </div>
      <span style={{ width: 14, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "2px 0" }}>
        <div>
          <div style={{ ...body(15, { color: C.textDark, weight: 800, height: 1.3 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
          {item.description && (<>
            <div style={{ height: 3 }} />
            <div style={{ ...body(12.5, { color: C.muted, height: 1.35 }, u), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</div>
          </>)}
        </div>
        <div style={{ height: 8 }} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}><DishPrice item={item} size={16} /></div>
          <Tap onClick={(e) => { e.stopPropagation(); addDish(item, onTap, flash); }} style={{
            display: "flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, background: added ? C.accentLeaf : C.primary, transition: "background 180ms", flex: "none" }}>
            <Icon name={added ? "check_rounded" : "add_rounded"} size={16} color="#fff" />
            <span style={{ width: 4 }} />
            <span style={{ ...body(12.5, { color: "#fff", weight: 800, height: 1.2 }, u) }}>{added ? t("homeAdded") : t("add")}</span>
          </Tap>
        </div>
      </div>
    </div>
  );
}

function DishCarousel({ items, spacing, onTap }: { items: FoodItem[]; spacing: number; onTap: (i: FoodItem) => void }) {
  const { ref, width } = useBox();
  const cardWidth = clamp((width - spacing) / 1.8, 160, 230);
  const cardHeight = cardWidth * 1.36;
  const bleed = 10;
  return (
    <div ref={ref} style={{ height: cardHeight + bleed * 2 }}>
      <div className="hide-scrollbar" style={{ display: "flex", height: "100%", overflowX: "auto", padding: `${bleed}px 0`, boxSizing: "border-box", gap: spacing }}>
        {width > 0 && items.map((it) => (
          <div key={it.id} style={{ width: cardWidth, flex: "none", height: "100%" }}><DishCard item={it} onTap={() => onTap(it)} /></div>
        ))}
      </div>
    </div>
  );
}

export function WebPopularDishesSection({ items, layout, crossAxisCount, childAspectRatio, spacing, onTap }: {
  items: FoodItem[]; layout: DishLayout; crossAxisCount: number; childAspectRatio: number; spacing: number; onTap: (i: FoodItem) => void;
}) {
  const u = useScreen();
  if (!items.length) return null;
  if (layout === "list")
    return <div>{items.map((it, i) => <div key={it.id} style={{ marginTop: i ? u.h(spacing) : 0 }}><DishCardHorizontal item={it} onTap={() => onTap(it)} /></div>)}</div>;
  if (layout === "carousel") return <DishCarousel items={items} spacing={spacing} onTap={onTap} />;
  return (
    <div style={{ display: "grid", paddingTop: 6, gridTemplateColumns: `repeat(${crossAxisCount}, minmax(0, 1fr))`, columnGap: u.w(spacing), rowGap: u.h(spacing) }}>
      {items.map((it) => <div key={it.id} style={{ aspectRatio: String(childAspectRatio), minWidth: 0 }}><DishCard item={it} onTap={() => onTap(it)} /></div>)}
    </div>
  );
}

export function DishSection({ items, phoneLayout, phoneMaxItems, isSmall, isTablet, clearSearch }: {
  items: FoodItem[]; phoneLayout: DishLayout; phoneMaxItems: number; isSmall: boolean; isTablet: boolean; clearSearch: () => void;
}) {
  const router = useRouter();
  if (!items.length) return null;
  const maxItems = isSmall ? phoneMaxItems : isTablet ? 6 : 10;
  return (
    <WebPopularDishesSection items={items.slice(0, maxItems)} layout={isSmall ? phoneLayout : "grid"} crossAxisCount={isTablet ? 3 : 5}
      childAspectRatio={isTablet ? 0.8 : 0.74} spacing={isSmall ? 12 : 20}
      onTap={(item) => { clearSearch(); setExtra(ROUTES.foodDetail, item); router.push(foodHref(item)); }} />
  );
}

// ---------------- Hero ----------------
const HERO_MAIN = "/assets/videos/posters/saborly_come_eat_now.jpg";
const HERO_SIDE = "/assets/videos/posters/saborly_taste_of_pakistan.jpg";
const HERO_SIDE_ALT = "/assets/videos/posters/saborly_family_moments.jpg";

function HeroButton({ label, icon, filled, large, onTap }: { label: string; icon: string; filled: boolean; large: boolean; onTap: () => void }) {
  const u = useScreen();
  const [hover, setHover] = useState(false);
  const fg = filled ? C.primaryDark : "#fff";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Tap onClick={onTap} style={{
        display: "flex", alignItems: "center", padding: `${large ? 16 : 12}px ${large ? 26 : 18}px`, borderRadius: 14, transition: "background 160ms", boxSizing: "border-box",
        background: filled ? (hover ? C.secondaryLight : "#fff") : `rgba(255,255,255,${hover ? 0.12 : 0})`,
        border: filled ? undefined : "1.4px solid rgba(255,255,255,.45)",
      }}>
        <span style={{ ...body(large ? 15.5 : 14, { color: fg, weight: 800, height: 1.2 }, u), whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ width: 8 }} />
        <Icon name={icon} size={u.size(large ? 18 : 16)} color={fg} />
      </Tap>
    </div>
  );
}
function HeroBadge() {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", boxSizing: "border-box", padding: "6px 12px", background: withOpacity(C.secondary, 0.16), borderRadius: 999, border: `1px solid ${withOpacity(C.secondary, 0.35)}` }}>
      <Icon name="local_fire_department_rounded" size={u.size(14)} color={C.secondary} />
      <span style={{ width: 6 }} />
      <span style={{ ...body(12, { color: C.secondaryLight, weight: 800, height: 1.2 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("homeHeroBadge")}</span>
    </div>
  );
}
function HeroStats({ compact }: { compact: boolean }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [places, setPlaces] = useState<GooglePlaceSummary[]>([]);
  useEffect(() => { let on = true; void loadGooglePlaces().then((p) => on && setPlaces(p)); return () => { on = false; }; }, []);
  const summary = googleRatingSummary(places);
  const stats = [
    ...(summary ? [{ icon: "star_rounded", value: summary.rating.toFixed(1), label: t("homeStatGoogleRating") }] : []),
    { icon: "timer_outlined", value: t("homeStatDeliveryValue"), label: t("homeStatDelivery") },
    { icon: "restaurant_menu_rounded", value: "150+", label: t("homeStatDishes") },
  ];
  return (
    <div style={{ display: "flex", width: compact ? "100%" : undefined }}>
      {stats.map((s, i) => (
        <div key={s.icon} style={{ display: "flex", ...(compact ? { flex: 1, minWidth: 0 } : {}) }}>
          {i > 0 && <div style={{ width: 1, height: compact ? 34 : 40, margin: `0 ${compact ? 12 : 24}px`, background: "rgba(255,255,255,.14)", flex: "none", alignSelf: "center" }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Icon name={s.icon} size={u.size(compact ? 14 : 18)} color={C.secondary} />
              <span style={{ width: compact ? 4 : 6 }} />
              <span style={{ ...heading(compact ? 16 : 22, "#fff", 1.1, u) }}>{s.value}</span>
            </div>
            <div style={{ height: 3 }} />
            <div style={{ ...body(compact ? 10.5 : 12.5, { color: "rgba(255,255,255,.65)", weight: 600, height: 1.3 }, u), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function Photo({ src, align }: { src: string; align: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 22, boxShadow: "0 12px 24px rgba(0,0,0,.333)", overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", boxSizing: "border-box" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: align }} />
    </div>
  );
}
// Flutter Alignment(x, y) -> CSS object-position percentages: (x+1)/2*100%, (y+1)/2*100%
const pos = (x: number, y: number) => `${((x + 1) / 2) * 100}% ${((y + 1) / 2) * 100}%`;

export function HeroIntroSection({ isWeb, clearSearch }: { isWeb: boolean; clearSearch: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const { ref, width } = useBox();
  const ctas = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <HeroButton label={t("homeHeroOrderNow")} icon="arrow_forward_rounded" filled large={isWeb} onTap={() => { clearSearch(); router.push(ROUTES.menu); }} />
      <HeroButton label={t("homeHeroViewOffers")} icon="local_offer_outlined" filled={false} large={isWeb} onTap={() => { clearSearch(); router.push(ROUTES.offer); }} />
    </div>
  );
  if (isWeb) {
    const showPhotos = width >= 860;
    return (
      <div ref={ref} style={{
        width: "100%", position: "relative", overflow: "hidden", borderRadius: 32, background: "linear-gradient(135deg, #2A1611 0%, #4A1D12 55%, #7B2F17 100%)",
        boxShadow: `0 18px 40px ${withOpacity(C.accentNight, 0.25)}`,
      }}>
        <div style={{ position: "absolute", left: -120, top: -160, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle closest-side, ${withOpacity(C.primary, 0.35)}, ${withOpacity(C.primary, 0)})` }} />
        <div style={{ position: "relative", padding: 48, display: "flex", alignItems: "center" }}>
          <div style={{ flex: 11, minWidth: 0 }}>
            <HeroBadge />
            <div style={{ height: 20 }} />
            <div style={display(44, "#fff", 1.12, u)}>{t("homeHeroTitle")}</div>
            <div style={{ height: 16 }} />
            <div style={{ maxWidth: 520, ...body(16, { color: "rgba(255,255,255,.78)", height: 1.55 }, u) }}>{t("homeHeroSubtitle")}</div>
            <div style={{ height: 28 }} />
            {ctas}
            <div style={{ height: 36 }} />
            <HeroStats compact={false} />
          </div>
          {showPhotos && (
            <>
              <span style={{ width: 48, flex: "none" }} />
              <div style={{ flex: 9, minWidth: 0, height: 400, display: "flex", gap: 14 }}>
                <div style={{ flex: 6, minWidth: 0 }}><Photo src={HERO_MAIN} align={pos(0, -0.1)} /></div>
                <div style={{ flex: 5, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ flex: 1, minHeight: 0 }}><Photo src={HERO_SIDE} align={pos(0, -0.25)} /></div>
                  <div style={{ flex: 1, minHeight: 0 }}><Photo src={HERO_SIDE_ALT} align={pos(0, 0.1)} /></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden", borderRadius: 24, background: C.accentNight, boxShadow: `0 10px 24px ${withOpacity(C.accentNight, 0.22)}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_MAIN} alt="" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 190, height: "100%", objectFit: "cover", objectPosition: pos(0, -0.1) }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #2A1611 0%, rgba(42,22,17,.949) 50%, rgba(42,22,17,.4) 100%)" }} />
      <div style={{ position: "relative", padding: "20px 20px 18px" }}>
        <HeroBadge />
        <div style={{ height: 14 }} />
        <div style={{ width: "80%", ...display(23, "#fff", 1.15, u) }}>{t("homeHeroTitle")}</div>
        <div style={{ height: 8 }} />
        <div style={{ width: "80%", ...body(13, { color: "rgba(255,255,255,.8)", height: 1.45 }, u) }}>{t("homeHeroSubtitle")}</div>
        <div style={{ height: 18 }} />
        {ctas}
        <div style={{ height: 18 }} />
        <HeroStats compact />
      </div>
    </div>
  );
}

// ---------------- HomeErrorBanner ----------------
export function HomeErrorBanner({ onRetry }: { onRetry: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: `${u.h(18)}px ${u.w(18)}px`, display: "flex", alignItems: "center", background: "#fff", borderRadius: u.r(20),
      border: `1px solid ${withOpacity(C.border, 0.6)}`, boxShadow: `0 ${u.h(6)}px 14px ${withOpacity("#1A0803", 0.08)}` }}>
      <div style={{ width: u.w(40), height: u.w(40), borderRadius: "50%", background: withOpacity(C.error, 0.1), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Icon name="wifi_off_rounded" size={u.sp(20)} color={C.error} />
      </div>
      <span style={{ width: u.w(12) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u.sp(14), fontWeight: 800, color: C.textDark }}>{t("homeLoadErrorTitle")}</div>
        <div style={{ height: u.h(2) }} />
        <div style={{ fontSize: u.sp(12), color: C.textMedium }}>{t("homeLoadErrorBody")}</div>
      </div>
      <span style={{ width: u.w(10) }} />
      <Tap onClick={onRetry} style={{ padding: `${u.h(10)}px ${u.w(14)}px`, borderRadius: u.r(12), background: C.premiumAccent, color: C.primary, fontSize: u.sp(13), fontWeight: 800 }}>{t("retry")}</Tap>
    </div>
  );
}
