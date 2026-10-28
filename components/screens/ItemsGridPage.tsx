"use client";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap } from "@/components/ui/primitives";
import { FoodItemCard } from "@/components/cards/FoodItemCard";
import { ROUTES, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import { useHome } from "@/lib/stores/catalog";
import { useLanguage } from "@/lib/stores/language";

/** Port of ItemsGridPage (home_screen.dart): "view all" for featured / popular items. */
export function ItemsGridPage({ type }: { type: "featured" | "popular" }) {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const home = useHome();
  const items = type === "featured" ? home.featuredItems : home.popularItems;
  const titleKey = type === "featured" ? "featuredItems" : "popularItems";
  const emptyIcon = type === "featured" ? "star_border" : "trending_up";
  const emptyTitleKey = type === "featured" ? "noFeaturedItems" : "noPopularItems";
  const sw = u.width;
  const cols = sw >= 1200 ? 5 : sw >= 900 ? 4 : sw >= 600 ? 3 : 1;
  const ratio = sw >= 1200 ? 0.7 : sw >= 900 ? 0.72 : sw >= 600 ? 0.75 : 1.1;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.background }}>
      <header style={{ height: 56, flex: "none", background: "#fff", boxShadow: "0 0.5px 1px rgba(0,0,0,.2)", display: "flex", alignItems: "center", padding: "0 4px", position: "relative", zIndex: 2 }}>
        <Tap ariaLabel="Back" onClick={() => router.back()} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrow_back" size={24} color={C.textDark} />
        </Tap>
        <span style={{ width: 8 }} />
        <span style={{ fontFamily: "var(--font-bree), serif", fontSize: u.sp(20), fontWeight: 700, color: C.textDark }}>{t(titleKey)}</span>
      </header>
      {home.isLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Icon name={emptyIcon} size={u.sp(80)} color={C.textLight} />
          <div style={{ height: u.h(16) }} />
          <div style={{ fontSize: u.sp(20), fontWeight: 600, color: C.textDark }}>{t(emptyTitleKey)}</div>
          <div style={{ height: u.h(8) }} />
          <div style={{ fontSize: u.sp(14), color: C.textLight }}>{t("checkBackForItems")}</div>
        </div>
      ) : (
        <div style={{ padding: u.w(16), display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: u.w(12), rowGap: u.h(12) }}>
          {items.map((item) => (
            <div key={`${type}_${item.id}`} style={{ aspectRatio: String(ratio), minWidth: 0 }}>
              <FoodItemCard foodItem={item} onTap={() => { setExtra(ROUTES.foodDetail, item); router.push(foodHref(item)); }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
