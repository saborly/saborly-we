"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, G, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Sheet, Spinner, Tap, Dialog } from "@/components/ui/primitives";
import { FoodItemCard } from "@/components/cards/FoodItemCard";
import { SearchBar } from "@/components/shell/SearchBar";
import { FoodKingFooter } from "@/components/home/more";
import { MButton } from "@/components/ui/MButton";
import { FoodItem } from "@/lib/models";
import { ROUTES, consumeExtra, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import {
  clearFilters, loadCategories, loadFoodItems, menuStore, searchFoodItems, setNonVegFilter, setPopularFilter, setVegFilter, useMenu,
} from "@/lib/stores/catalog";
import { useLanguage } from "@/lib/stores/language";

const poppins = "var(--font-poppins), sans-serif";
const maxContentWidth = (w: number) => (w >= 1400 ? 1400 : w >= 1200 ? 1200 : w * 0.95);
const crossAxisCount = (w: number) => (w >= 1600 ? 5 : w >= 1200 ? 4 : w >= 900 ? 3 : w >= 600 ? 2 : 1);

function categoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("burger")) return "lunch_dining_rounded";
  if (n.includes("pizza")) return "local_pizza_rounded";
  if (n.includes("chicken")) return "set_meal_rounded";
  if (n.includes("seafood")) return "set_meal_rounded";
  if (n.includes("sandwich")) return "lunch_dining_rounded";
  if (n.includes("salad")) return "eco_rounded";
  if (n.includes("appetizer")) return "restaurant_rounded";
  if (n.includes("dessert")) return "cake_rounded";
  if (n.includes("drink") || n.includes("beverage")) return "local_cafe_rounded";
  return "restaurant_menu_rounded";
}

// Port of lib/features/menu/screens/menu_screen.dart (+ menu/widgets/*)
export function MenuScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const menu = useMenu();
  const [initialized, setInitialized] = useState(false);
  const [tabIndex, setTabIndex] = useState<number | null>(null); // null until TabController exists
  const selectedCategory = useRef<string | null>(null);
  const [sheet, setSheet] = useState(false), [dialog, setDialog] = useState(false);
  const isWeb = u.width >= 1200;

  useEffect(() => {
    const extra = consumeExtra<{ category?: string }>(ROUTES.menu);
    selectedCategory.current = extra?.category ?? null;
    void (async () => {
      try {
        await Promise.all([
          ...(menuStore.state.categories.length === 0 ? [loadCategories()] : []),
          loadFoodItems(selectedCategory.current),
        ]);
        const cats = menuStore.state.categories;
        if (cats.length > 0) {
          let idx = 0;
          if (selectedCategory.current != null) { const i = cats.findIndex((c) => c.id === selectedCategory.current); if (i !== -1) idx = i + 1; }
          setTabIndex(idx);
        }
      } catch { /* logged in Dart debug only */ }
      finally { setInitialized(true); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onTab = (i: number) => {
    setTabIndex(i);
    if (i === 0) { selectedCategory.current = null; void loadFoodItems(); }
    else if (i - 1 < menu.categories.length) { selectedCategory.current = menu.categories[i - 1].id; void loadFoodItems(selectedCategory.current); }
  };
  const retry = () => void loadFoodItems(selectedCategory.current);

  const loading = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <Spinner size={u.w(60)} stroke={3} />
      <div style={{ height: u.h(24) }} />
      <div style={{ fontFamily: poppins, fontSize: u.sp(16), color: C.textMedium, fontWeight: 500 }}>{t("loadingMenu")}</div>
    </div>
  );

  let body: React.ReactNode;
  if (!initialized && menu.isLoading) body = loading;
  else if (initialized && menu.error != null) body = <ErrorState error={menu.error} onRetry={retry} />;
  else if (initialized && menu.categories.length === 0) body = <EmptyState message={t("noCategoriesAvailable")} onRetry={retry} />;
  else if (!initialized) body = loading;
  else body = (
    <>
      {isWeb && <WebHeader onFilter={() => setDialog(true)} />}
      {!isWeb && <SearchSection />}
      {tabIndex != null && <CategoryTabs selected={tabIndex} onSelect={onTab} isWeb={isWeb} />}
      <FilterChips isWeb={isWeb} />
      <FoodGrid isWeb={isWeb} onRetry={retry} onItem={(i) => { setExtra(ROUTES.foodDetail, i); router.push(foodHref(i)); }} />
      {isWeb && <FoodKingFooter />}
    </>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.background }}>
      {!isWeb && <MenuAppBar onFilter={() => setSheet(true)} />}
      {body}
      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <FilterPanel kind="sheet" onClose={() => setSheet(false)} />
      </Sheet>
      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <FilterPanel kind="dialog" onClose={() => setDialog(false)} />
      </Dialog>
    </div>
  );
}

function MenuAppBar({ onFilter }: { onFilter: () => void }) {
  const { sp, w, h, r } = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const btn = (icon: string, onClick: () => void, aria: string) => (
    <Tap ariaLabel={aria} onClick={onClick} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: r(8), background: "#fff", borderRadius: r(14), boxShadow: `0 ${h(4)}px ${r(10)}px ${withOpacity("#1A0803", 0.2)}`, display: "flex" }}>
        <Icon name={icon} size={icon === "tune_rounded" ? sp(20) : sp(18)} color={C.primary} />
      </div>
    </Tap>
  );
  return (
    <header style={{ flex: "none", background: C.background, position: "relative" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 4px", position: "relative" }}>
        {btn("arrow_back_ios_new", () => (window.history.length > 1 ? router.back() : router.push(ROUTES.home)), "Back")}
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontFamily: "var(--font-bree), serif", fontSize: sp(22), color: C.textDark, letterSpacing: -0.5 }}>{t("ourMenu")}</div>
        <span style={{ flex: 1 }} />
        {btn("tune_rounded", onFilter, "Filters")}
        <span style={{ width: w(8) }} />
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${withOpacity(C.primary, 0.1)}, transparent)` }} />
    </header>
  );
}

function SearchSection() {
  const { w, h, r } = useScreen();
  return (
    <div style={{ padding: `${h(16)}px ${w(16)}px ${h(8)}px` }}>
      <div style={{ padding: w(14), background: G.surface, borderRadius: r(24), border: "1.4px solid rgba(255,255,255,.95)", boxShadow: `0 ${h(8)}px ${r(18)}px ${withOpacity("#1A0803", 0.16)}` }}>
        <SearchBar onSearch={searchFoodItems} />
      </div>
    </div>
  );
}

function WebHeader({ onFilter }: { onFilter: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: `${u.h(32)}px ${u.w(48)}px ${u.h(24)}px`, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: maxContentWidth(u.width), boxSizing: "border-box", padding: u.w(28), background: G.hero, borderRadius: u.r(32), boxShadow: `0 14px ${u.r(28)}px ${withOpacity(C.primaryDark, 0.24)}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-block", padding: `${u.h(8)}px ${u.w(12)}px`, background: "rgba(255,255,255,.14)", borderRadius: 999, color: "#fff", fontSize: u.sp(13), fontWeight: 800 }}>Bolder menu discovery</div>
          <div style={{ height: u.h(16) }} />
          <div style={{ fontFamily: "var(--font-bree), serif", fontSize: u.sp(42), color: "#fff", letterSpacing: -1.3, lineHeight: 1.1 }}>{t("ourMenu")}</div>
          <div style={{ height: u.h(10) }} />
          <div style={{ fontSize: u.sp(16), color: "rgba(255,255,255,.84)", fontWeight: 600 }}>{t("discoverOfferings")}</div>
        </div>
        <span style={{ width: u.w(24) }} />
        <MButton onClick={onFilter} padding={[u.h(18), u.w(32)]} radius={u.r(18)} bg="#fff" fg={C.primaryDark} fontFamily="var(--font-manrope), sans-serif" fontSize={u.sp(15)} fontWeight={800} style={{ flex: "none" }}>
          <Icon name="tune_rounded" size={u.sp(20)} color={C.primaryDark} /><span style={{ width: 8 }} />
          <span>{t("filters")}</span>
        </MButton>
      </div>
    </div>
  );
}

function CategoryTabs({ selected, onSelect, isWeb }: { selected: number; onSelect: (i: number) => void; isWeb: boolean }) {
  const u = useScreen();
  const { t } = useLanguage();
  const menu = useMenu();
  const tabs = [{ label: t("allCategories"), icon: "apps_rounded" }, ...menu.categories.map((c) => ({ label: c.name.replace(/\n/g, " "), icon: categoryIcon(c.name) }))];
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [ind, setInd] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const el = refs.current[selected];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [selected, tabs.length, u.width, menu.currentLanguage]);
  useEffect(() => { refs.current[selected]?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }); }, [selected]);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: maxContentWidth(u.width) }}>
        <div style={{
          margin: `${u.h(20)}px ${isWeb ? u.w(48) : u.w(16)}px`, background: G.surface, borderRadius: u.r(24), border: `1px solid ${C.border}`, boxShadow: `0 8px 22px ${withOpacity("#1A0803", 0.18)}`,
        }}>
          <div style={{ height: u.h(60), padding: u.w(6), boxSizing: "border-box", display: "flex", alignItems: "center" }}>
            <div className="hide-scrollbar" style={{ position: "relative", display: "flex", overflowX: "auto", maxWidth: "100%", height: u.h(48) }}>
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: ind.left, width: ind.width, borderRadius: u.r(14), transition: "left 300ms cubic-bezier(.4,0,.2,1), width 300ms cubic-bezier(.4,0,.2,1)",
                background: `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.85)})`, boxShadow: `0 4px 12px ${withOpacity(C.primary, 0.35)}`,
              }} />
              {tabs.map((tab, i) => {
                const sel = i === selected;
                return (
                  <div key={i} ref={(el) => { refs.current[i] = el; }} style={{ position: "relative", flex: "none", padding: `0 ${u.w(4)}px` }}>
                    <Tap onClick={() => onSelect(i)} style={{
                      height: u.h(48), boxSizing: "border-box", padding: `${u.h(8)}px ${u.w(20)}px`, display: "flex", alignItems: "center", fontFamily: poppins, fontSize: u.sp(14),
                      fontWeight: sel ? 700 : 500, letterSpacing: sel ? 0.3 : 0, color: sel ? "#fff" : C.textMedium, whiteSpace: "nowrap",
                    }}>
                      <Icon name={tab.icon} size={u.sp(18)} color={sel ? "#fff" : C.textMedium} /><span style={{ width: u.w(8) }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tab.label}</span>
                    </Tap>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChips({ isWeb }: { isWeb: boolean }) {
  const u = useScreen();
  const { t } = useLanguage();
  const menu = useMenu();
  const chip = (label: string, icon: string, on: boolean, tap: () => void, accent: string) => (
    <Tap onClick={tap} style={{
      display: "flex", alignItems: "center", flex: "none", padding: `${u.h(12)}px ${u.w(20)}px`, borderRadius: u.r(30), boxSizing: "border-box", transition: "all 250ms ease-in-out",
      background: on ? `linear-gradient(135deg, ${accent}, ${withOpacity(accent, 0.8)})` : "#fff", border: `${on ? 2 : 1.5}px solid ${on ? accent : "#E0E0E0"}`,
      boxShadow: on ? `0 4px 12px ${withOpacity(accent, 0.4)}` : "0 2px 8px rgba(0,0,0,.04)",
    }}>
      <Icon name={icon} size={u.sp(18)} color={on ? "#fff" : accent} /><span style={{ width: u.w(8) }} />
      <span style={{ fontFamily: poppins, fontSize: u.sp(14), fontWeight: 600, color: on ? "#fff" : C.textDark, letterSpacing: 0.2 }}>{label}</span>
    </Tap>
  );
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: maxContentWidth(u.width) }}>
        <div style={{ margin: `${u.h(10)}px ${isWeb ? u.w(48) : u.w(16)}px ${u.h(6)}px`, display: "flex", justifyContent: "center" }}>
          <div className="hide-scrollbar" style={{ maxWidth: "100%", boxSizing: "border-box", padding: `${u.h(12)}px ${u.w(12)}px`, background: "rgba(255,255,255,.65)", borderRadius: u.r(24), border: `1px solid ${C.border}`, display: "flex", overflowX: "auto", gap: u.w(12) }}>
            {chip(t("vegetarian"), "eco_rounded", menu.showVegOnly, () => setVegFilter(!menu.showVegOnly), C.accentLeaf)}
            {chip(t("nonVegetarian"), "restaurant_rounded", menu.showNonVegOnly, () => setNonVegFilter(!menu.showNonVegOnly), C.primary)}
            {chip(t("featuredItems"), "local_fire_department_rounded", menu.showPopularOnly, () => setPopularFilter(!menu.showPopularOnly), C.secondary)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${u.h(32)}px ${u.w(24)}px` }}>
      <div style={{ padding: u.r(24), background: withOpacity(C.primary, 0.1), borderRadius: "50%", display: "flex" }}><Icon name="restaurant_menu_rounded" size={u.sp(64)} color={C.primary} /></div>
      <div style={{ height: u.h(24) }} />
      <div style={{ textAlign: "center", fontFamily: poppins, fontSize: u.sp(18), color: C.textMedium, fontWeight: 600 }}>{message}</div>
      <div style={{ height: u.h(16) }} />
      <MButton onClick={onRetry} padding={[u.h(12), u.w(24)]} radius={u.r(12)} fontFamily={poppins} fontSize={u.sp(16)} fontWeight={600}>{t("retry")}</MButton>
    </div>
  );
}
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Icon name="error_outline" size={u.sp(80)} color={C.error} />
      <div style={{ height: u.h(16) }} />
      <div style={{ fontFamily: poppins, fontSize: u.sp(20), fontWeight: 600, color: C.textDark }}>{t("error")}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ fontFamily: poppins, fontSize: u.sp(14), color: C.textLight, textAlign: "center" }}>{error}</div>
      <div style={{ height: u.h(16) }} />
      <MButton onClick={onRetry} padding={[u.h(12), u.w(24)]} radius={u.r(12)} fontFamily={poppins} fontSize={u.sp(16)} fontWeight={600}>Retry</MButton>
    </div>
  );
}

function FoodGrid({ isWeb, onRetry, onItem }: { isWeb: boolean; onRetry: () => void; onItem: (i: FoodItem) => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const menu = useMenu();
  if (menu.isLoading || menu.isSearching)
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}><Spinner /></div>;
  if (!menu.hasItems || menu.foodItems.length === 0)
    return <div style={{ flex: 1, display: "flex", flexDirection: "column" }}><EmptyState message={t("noFoodItemsAvailable")} onRetry={onRetry} /></div>;
  const cols = crossAxisCount(u.width);
  const ratio = u.width >= 1200 ? 0.75 : u.width >= 600 ? 0.7 : 1.1;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: `${isWeb ? u.h(8) : u.h(10)}px ${isWeb ? u.w(48) : u.w(16)}px ${u.h(32)}px` }}>
      <div style={{ width: "100%", boxSizing: "border-box" }}>
        <div style={{ background: G.surface, borderRadius: u.r(28), border: "1.5px solid rgba(255,255,255,.96)", boxShadow: `0 ${u.h(10)}px ${u.r(20)}px ${withOpacity("#1A0803", 0.16)}`, padding: isWeb ? u.w(18) : u.w(12) }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: u.w(20), rowGap: u.h(20) }}>
            {menu.foodItems.map((item) => (
              <div key={item.id} style={{ aspectRatio: String(ratio), minWidth: 0 }}><FoodItemCard foodItem={item} showDescription onTap={() => onItem(item)} /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ kind, onClose }: { kind: "sheet" | "dialog"; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const menu = useMenu();
  const tile = (title: string, icon: string, value: boolean, onChange: (v: boolean) => void, accent: string) => (
    <div style={{ background: value ? withOpacity(accent, 0.1) : "#FAFAFA", borderRadius: u.r(12), border: `${value ? 2 : 1}px solid ${value ? accent : "#EEEEEE"}` }}>
      <Tap onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", padding: `${u.h(4)}px ${u.w(12)}px`, minHeight: 48, boxSizing: "border-box" }}>
        <Icon name={icon} size={u.sp(20)} color={value ? accent : "#757575"} /><span style={{ width: u.w(12) }} />
        <span style={{ flex: 1, fontFamily: poppins, fontSize: u.sp(15), fontWeight: value ? 600 : 500, color: value ? accent : C.textDark }}>{title}</span>
        <span style={{ width: 18, height: 18, borderRadius: 2, boxSizing: "border-box", border: value ? "none" : "2px solid #757575", background: value ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {value && <Icon name="check" size={16} color="#fff" />}
        </span>
      </Tap>
    </div>
  );
  const options = (
    <div>
      <div style={{ fontFamily: poppins, fontSize: u.sp(16), fontWeight: 600, color: C.textDark }}>{t("foodType")}</div>
      <div style={{ height: u.h(16) }} />
      {tile(t("vegetarian"), "eco_rounded", menu.showVegOnly, (v) => setVegFilter(v), "#10B981")}
      <div style={{ height: u.h(8) }} />
      {tile(t("nonVegetarian"), "restaurant_rounded", menu.showNonVegOnly, (v) => setNonVegFilter(v), "#EF4444")}
      <div style={{ height: u.h(8) }} />
      {tile(t("popularItems"), "local_fire_department_rounded", menu.showPopularOnly, (v) => setPopularFilter(v), "#F59E0B")}
    </div>
  );
  const buttons = (clearLabel: string, applyLabel: string) => (
    <div style={{ display: "flex", gap: u.w(12) }}>
      <div style={{ flex: 1, display: "flex" }}><MButton variant="outlined" fullWidth onClick={() => { clearFilters(); onClose(); }} padding={[u.h(16), 0]} radius={u.r(14)} border={`2px solid ${C.primary}`} fg={C.primary} fontFamily={poppins} fontSize={u.sp(15)} fontWeight={600}>{clearLabel}</MButton></div>
      <div style={{ flex: 1, display: "flex" }}><MButton fullWidth onClick={onClose} padding={[u.h(16), u.w(20)]} radius={u.r(14)} fontFamily={poppins} fontSize={u.sp(15)} fontWeight={600}>{applyLabel}</MButton></div>
    </div>
  );
  if (kind === "dialog")
    return (
      <div style={{ background: "#fff", borderRadius: u.r(24), width: u.w(500), maxWidth: "100%", padding: u.w(32), boxSizing: "border-box" }}>
        <div style={{ fontFamily: poppins, fontSize: u.sp(26), fontWeight: 700, color: C.textDark }}>{t("filters")}</div>
        <div style={{ height: u.h(24) }} />{options}<div style={{ height: u.h(32) }} />{buttons(t("clearAll"), t("apply"))}
      </div>
    );
  return (
    <div style={{ background: "#fff", borderRadius: `${u.r(28)}px ${u.r(28)}px 0 0`, padding: `${u.h(16)}px ${u.w(24)}px ${u.h(32)}px`, boxShadow: "0 -4px 20px rgba(0,0,0,.1)" }}>
      <div style={{ width: u.w(40), height: u.h(4), margin: "0 auto", background: "#E0E0E0", borderRadius: u.r(2) }} />
      <div style={{ height: u.h(24) }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: poppins, fontSize: u.sp(24), fontWeight: 700, color: C.textDark }}>{t("filters")}</span>
        <Tap onClick={onClose} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close_rounded" size={u.sp(24)} /></Tap>
      </div>
      <div style={{ height: u.h(24) }} />{options}<div style={{ height: u.h(24) }} />{buttons("Clear All", "Apply")}
    </div>
  );
}
