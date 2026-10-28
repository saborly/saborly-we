"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { FoodItemCard } from "@/components/cards/FoodItemCard";
import { SearchBar } from "@/components/shell/SearchBar";
import { ROUTES, consumeExtra, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import { exitSearchMode, performSearch, useHome } from "@/lib/stores/catalog";
import { useLanguage } from "@/lib/stores/language";

const iconForFood = (food: string) => {
  const l = food.toLowerCase();
  if (l.includes("pizza")) return "local_pizza_rounded";
  if (l.includes("burger")) return "lunch_dining_rounded";
  if (l.includes("pasta") || l.includes("noodle")) return "ramen_dining_rounded";
  if (l.includes("salad")) return "eco_rounded";
  return "restaurant_rounded";
};
const crossAxisCount = (w: number) => (w >= 1200 ? 5 : w >= 900 ? 4 : w >= 600 ? 3 : 1);

// Port of lib/features/menu/screens/search_results_page.dart (top-level route, outside the shell)
export function SearchResultsPage() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const home = useHome();
  const [text, setText] = useState("");
  const [active, setActive] = useState("");
  const activeRef = useRef("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = (q: string) => {
    if (activeRef.current === q) return;
    activeRef.current = q; setActive(q);
    if (q === "") exitSearchMode(); else void performSearch(q);
  };
  const retry = () => { // _performSearch(_activeQuery) is a no-op when the query is unchanged: mirrors the Dart guard
    run(active);
  };
  const onChanged = (q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim() === "") { run(""); return; }
    debounce.current = setTimeout(() => run(q.trim()), 500);
  };
  const clear = () => { setText(""); run(""); };

  useEffect(() => {
    const initial = consumeExtra<string>(ROUTES.search);
    if (initial) { setText(initial); setTimeout(() => run(initial), 0); }
    return () => { if (debounce.current) clearTimeout(debounce.current); exitSearchMode(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const center = (c: React.ReactNode, pad = 0) => <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center" }}>{c}</div>;
  let body: React.ReactNode;
  if (home.isSearchLoading) {
    body = center(<>
      <Spinner size={u.w(48)} stroke={3.5} />
      <div style={{ height: u.h(20) }} />
      <div style={{ fontSize: u.sp(16), fontWeight: 500, color: C.textMedium }}>{t("search")}...</div>
    </>);
  } else if (home.searchError != null) {
    body = center(<>
      <Icon name="error_outline" size={u.sp(64)} color="#EF5350" />
      <div style={{ height: u.h(20) }} />
      <div style={{ fontSize: u.sp(20), fontWeight: 500, color: C.textDark }}>{t("error")}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ fontSize: u.sp(14), color: C.textMedium }}>{home.searchError}</div>
      <div style={{ height: u.h(24) }} />
      <MButton onClick={retry} padding={[u.h(12), u.w(24)]} radius={u.r(12)}>
        <Icon name="refresh" size={u.sp(18)} color="#fff" /><span style={{ width: 8 }} /><span>{t("retry")}</span>
      </MButton>
    </>, u.w(32));
  } else if (active === "") {
    body = center(<>
      <div style={{ padding: u.w(28), background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.15)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: "50%", display: "flex" }}><Icon name="restaurant_menu_rounded" size={u.sp(64)} color={C.primary} /></div>
      <div style={{ height: u.h(28) }} />
      <div style={{ fontSize: u.sp(22), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("startYourCulinaryJourney")}</div>
      <div style={{ height: u.h(12) }} />
      <div style={{ fontSize: u.sp(15), color: C.textMedium, lineHeight: 1.5 }}>{t("searchFoodDescription")}</div>
      <div style={{ height: u.h(32) }} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${u.h(12)}px ${u.w(12)}px` }}>
        {[t("pizza"), t("burger"), t("pasta"), t("salad")].map((label) => (
          <div key={label} onClick={() => { setText(label); run(label); }} style={{ background: "#fff", borderRadius: u.r(20), boxShadow: "0 1px 3px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.12)", cursor: "pointer" }}>
            <div style={{ padding: `${u.h(12)}px ${u.w(20)}px`, border: `1px solid ${withOpacity(C.primary, 0.2)}`, borderRadius: u.r(20), display: "flex", alignItems: "center" }}>
              <Icon name={iconForFood(label)} size={u.sp(18)} color={C.primary} /><span style={{ width: u.w(8) }} />
              <span style={{ fontSize: u.sp(14), fontWeight: 500, color: C.textDark }}>{label}</span>
            </div>
          </div>
        ))}
      </div>
    </>, u.w(32));
  } else if (home.searchResults.length === 0) {
    body = center(<>
      <div style={{ padding: u.w(28), background: "rgba(158,158,158,.1)", borderRadius: "50%", display: "flex" }}><Icon name="search_off_rounded" size={u.sp(64)} color="#757575" /></div>
      <div style={{ height: u.h(28) }} />
      <div style={{ fontSize: u.sp(22), fontWeight: 700, color: C.textDark }}>{t("noData")}</div>
      <div style={{ height: u.h(12) }} />
      <div style={{ fontSize: u.sp(15), color: C.textMedium, lineHeight: 1.5 }}>{t("search")} &quot;{active}&quot; {t("noData")}</div>
      <div style={{ height: u.h(28) }} />
      <MButton variant="outlined" onClick={clear} padding={[u.h(12), u.w(24)]} radius={u.r(12)} fg={C.primary} border={`2px solid ${C.primary}`} fontSize={u.sp(15)} fontWeight={600}>
        <Icon name="clear_all" size={u.sp(18)} color={C.primary} /><span style={{ width: 8 }} /><span>{t("clear")} {t("search")}</span>
      </MButton>
    </>, u.w(32));
  } else {
    const results = home.searchResults;
    const w = u.width - 2 * u.w(20);
    const count = results.length;
    body = (
      <div>
        <div style={{ padding: `${u.h(8)}px 0 ${u.h(20)}px` }}>
          <div style={{ padding: u.w(16), background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.08)}, ${withOpacity(C.primary, 0.03)})`, borderRadius: u.r(12), border: `1px solid ${withOpacity(C.primary, 0.15)}`, display: "flex", alignItems: "center" }}>
            <div style={{ padding: u.w(8), background: C.primary, borderRadius: u.r(8), display: "flex" }}><Icon name="search" size={u.sp(18)} color="#fff" /></div>
            <span style={{ width: u.w(12) }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: u.sp(16), fontWeight: 500, color: C.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>&quot;{active}&quot;</div>
              <div style={{ height: u.h(2) }} />
              <div style={{ fontSize: u.sp(13), color: C.textMedium }}>{count} {count === 1 ? t("item") : t("items")} {t("found")}</div>
            </div>
            <button aria-label="clear" onClick={clear} style={{ border: 0, background: "transparent", cursor: "pointer", padding: u.w(8), display: "flex" }}><Icon name="close" size={u.sp(20)} color={C.textMedium} /></button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${crossAxisCount(w)}, minmax(0, 1fr))`, columnGap: u.w(16), rowGap: u.h(16) }}>
          {results.map((item) => (
            <div key={`search_${item.id}`} style={{ aspectRatio: String(w < 600 ? 1.1 : 0.75) }}>
              <FoodItemCard foodItem={item} showDescription onTap={() => { setExtra(ROUTES.foodDetail, item); router.push(foodHref(item)); }} />
            </div>
          ))}
        </div>
        <div style={{ height: u.h(24) }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, background: "#F8F9FA", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", padding: `${u.h(16)}px ${u.w(20)}px 0`, boxSizing: "border-box" }}>
        <div style={{ background: "#fff", borderRadius: u.r(16), boxShadow: `0 ${u.h(4)}px ${u.r(12)}px rgba(0,0,0,.06)` }}>
          <SearchBar value={text} onValueChange={setText} onSearch={onChanged} hintText={t("search")} />
        </div>
        <div style={{ height: u.h(16) }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 ${u.w(20)}px`, display: "flex", flexDirection: "column" }}>{body}</div>
    </div>
  );
}
