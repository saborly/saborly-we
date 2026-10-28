"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap } from "@/components/ui/primitives";
import { FoodItemCard } from "@/components/cards/FoodItemCard";
import { LanguageSelector } from "@/components/shell/LanguageSelector";
import { SearchBar } from "@/components/shell/SearchBar";
import {
  CategoriesSlider, DishSection, HeroIntroSection, HomeErrorBanner, MobileCategoriesSection, SectionHeader, ShowcaseShell,
} from "@/components/home/parts";
import { DynamicPromotionalBanner, OffersSection, VideoShowcaseSection } from "@/components/home/media";
import { DownloadAppModal, FoodKingFooter, WebGoogleReviewsSection } from "@/components/home/more";
import { FoodItem } from "@/lib/models";
import { ROUTES, setExtra } from "@/lib/nav";
import { foodHref } from "@/lib/foodUrl";
import { useScreen } from "@/lib/screenutil";
import { prefs } from "@/lib/storage";
import { exitSearchMode, homeInitializeIfNeeded, homeStore, loadHomeData, performSearch, useHome } from "@/lib/stores/catalog";
import { checkoutStore, useCheckout } from "@/lib/stores/commerce";
import { useBranchName } from "@/lib/useBranchName";
import { languageStore, useLanguage } from "@/lib/stores/language";
import { loadOffers, useOffers } from "@/lib/stores/offers";
import { useNotifications } from "@/lib/stores/commerce";
import { openReels, SABORLY_VIDEOS } from "@/lib/videos";
import { body } from "@/components/home/parts";

// Port of lib/features/home/screens/home_screen.dart
export function HomeScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const home = useHome();
  const offers = useOffers();
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const modalInFlight = useRef(false);
  const hasLoadedRoute = useRef(false);
  const isWeb = u.width >= 1024;                       // ResponsiveUtils.isWeb
  const showMobileAppBar = u.width < 600;

  const clearSearchSilently = useCallback(() => { setSearchText(""); exitSearchMode(); }, []);
  const clearSearch = useCallback(() => {
    setSearchText(""); exitSearchMode();
    document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const checkDownloadModal = useCallback(async () => {
    if (modalInFlight.current) return;
    modalInFlight.current = true;
    try {
      const last = prefs.getInt("download_modal_dismissed") ?? 0;
      const now = Date.now();
      if (now - last <= 7_200_000) return;
      await new Promise((r) => setTimeout(r, 300));
      setShowModal(true);
      prefs.set("download_modal_dismissed", now);  // Dart awaits the dialog, then writes `now`; value identical
    } finally { modalInFlight.current = false; }
  }, []);

  const refreshHomeData = useCallback((force = false) => {
    if (hasLoadedRoute.current && !force) return;
    hasLoadedRoute.current = true;
    const lang = languageStore.state.language;
    void Promise.all([
      force ? loadHomeData() : homeStore.state.hasInitialized ? loadHomeData() : homeInitializeIfNeeded(lang),
      loadOffers(),
    ]);
    void checkDownloadModal();
  }, [checkDownloadModal]);

  useEffect(() => { clearSearchSilently(); refreshHomeData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => {
    if (!q.trim()) exitSearchMode();
    else {
      void performSearch(q.trim());
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    }
  };

  const wMax = (w: number) => (w >= 1400 ? 1400 : w >= 1200 ? 1200 : w * 0.95);
  const goFood = (item: FoodItem) => { clearSearchSilently(); setExtra(ROUTES.foodDetail, item); router.push(foodHref(item)); };

  if (home.isLoading && !home.isInSearchMode && home.categories.length === 0)
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}><Spinner /></div>;

  const isSmall = u.width < 600, isTablet = u.width >= 600 && u.width < 1200;
  const searching = home.isInSearchMode;
  const sectionGap = isWeb ? 64 : 32;
  const hasOffers = offers.itemsWithOffers.length > 0 || offers.allOffers.length > 0;
  const hpad = isSmall ? u.w(16) : isTablet ? u.w(40) : u.w(60);

  const section = (title: string, kicker: string, child: React.ReactNode, onViewAll?: () => void) => (
    <div>
      <SectionHeader title={title} kicker={kicker} isWeb={isWeb} onViewAll={onViewAll} />
      <div style={{ height: isWeb ? 24 : 14 }} />
      {child}
    </div>
  );

  return (
    <>
      {showMobileAppBar && <HomeMobileAppBar onClearSearchSilently={clearSearchSilently} onClearSearch={clearSearch} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: wMax(u.width), padding: `0 ${hpad}px`, boxSizing: "border-box" }}>
            <div style={{ height: isWeb ? 28 : 14 }} />
            {!isWeb && (<>
              <SearchBar value={searchText} onValueChange={setSearchText} onSearch={handleSearch} />
              <div style={{ height: 16 }} />
            </>)}
            {searching ? (
              <>
                {!isWeb && <SearchStatusBanner onClear={clearSearch} />}
                <div style={{ height: 24 }} />
                <SearchResultsSection resultsRef={resultsRef} isSmall={isSmall} isTablet={isTablet} onClearSearchSilently={clearSearchSilently} onClearSearch={clearSearch} onItem={goFood} />
              </>
            ) : (
              <>
                <DynamicPromotionalBanner />
                {home.error != null && home.categories.length === 0 && home.featuredItems.length === 0 && home.popularItems.length === 0 && (
                  <><div style={{ height: isWeb ? 28 : 18 }} /><HomeErrorBanner onRetry={() => refreshHomeData(true)} /></>
                )}
                {home.categories.length > 0 && (<>
                  <div style={{ height: isWeb ? 48 : 28 }} />
                  {section(t("ourMenu"), t("homeKickerCategories"),
                    isWeb ? <ShowcaseShell><CategoriesSlider categories={home.categories} isWeb={isWeb} clearSearch={clearSearchSilently} /></ShowcaseShell>
                      : <MobileCategoriesSection categories={home.categories} onTap={(c) => { clearSearchSilently(); setExtra(ROUTES.menu, { category: c.id }); router.push(ROUTES.menu); }} />,
                    () => { clearSearchSilently(); router.push(ROUTES.menu); })}
                </>)}
                {home.featuredItems.length > 0 && (<>
                  <div style={{ height: sectionGap }} />
                  {section(t("featuredItems"), t("homeKickerTopPicks"),
                    <DishSection items={home.featuredItems} phoneLayout="carousel" phoneMaxItems={8} isSmall={isSmall} isTablet={isTablet} clearSearch={clearSearchSilently} />,
                    () => { clearSearchSilently(); router.push("/items/featured"); })}
                </>)}
                <div style={{ height: sectionGap }} />
                <HeroIntroSection isWeb={isWeb} clearSearch={clearSearchSilently} />
                {hasOffers && (<>
                  <div style={{ height: sectionGap }} />
                  <OffersSection header={<div style={{ paddingBottom: isWeb ? 24 : 16 }}>
                    <SectionHeader title={t("specialOffers")} kicker={t("homeKickerOffers")} isWeb={isWeb} onViewAll={() => { clearSearchSilently(); router.push(ROUTES.offer); }} /></div>} />
                </>)}
                {home.popularItems.length > 0 && (<>
                  <div style={{ height: sectionGap }} />
                  {section(t("mostPopularItems"), t("homeKickerTrending"),
                    <DishSection items={home.popularItems} phoneLayout="list" phoneMaxItems={4} isSmall={isSmall} isTablet={isTablet} clearSearch={clearSearchSilently} />,
                    () => { clearSearchSilently(); router.push("/items/popular"); })}
                </>)}
                <div style={{ height: sectionGap }} />
                {section(t("videosTitle"), t("videosKicker"), <VideoShowcaseSection isWeb={isWeb} />, () => openReels(SABORLY_VIDEOS, 0))}
                <WebGoogleReviewsSection header={<div style={{ paddingTop: isWeb ? 52 : 20, paddingBottom: isWeb ? 24 : 16 }}>
                  <SectionHeader title={t("homeReviewsTitle")} kicker={t("homeKickerReviews")} isWeb={isWeb} /></div>} />
              </>
            )}
            <div style={{ height: isWeb ? 72 : 32 }} />
          </div>
        </div>
        {isWeb && !searching && <FoodKingFooter />}
      </div>
      {showModal && <DownloadAppModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function SearchStatusBanner({ onClear }: { onClear: () => void }) {
  const { sp, w, h, r } = useScreen();
  const { t } = useLanguage();
  const home = useHome();
  const total = home.searchResults.length;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: `${h(12)}px ${w(16)}px`, background: "linear-gradient(180deg, #FFF9F1, #FFF0E1)", borderRadius: r(18), border: `1px solid ${C.border}`, boxShadow: `0 ${h(6)}px ${r(14)}px ${withOpacity("#1A0803", 0.18)}` }}>
      <Icon name="search" size={sp(20)} color={C.primary} /><span style={{ width: w(12) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: sp(14), fontWeight: 600, color: C.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("homeSearchingFor").replace("{query}", home.lastSearchQuery)}</div>
        <div style={{ height: h(2) }} />
        <div style={{ fontSize: sp(12), color: C.textMedium }}>{home.isSearchLoading ? t("homeLoading") : total === 1 ? t("homeOneResultFound") : t("homeResultsFound").replace("{count}", String(total))}</div>
      </div>
      <Tap onClick={onClear} style={{ display: "flex" }}><Icon name="close" size={sp(20)} color={C.textDark} /></Tap>
    </div>
  );
}

function SearchResultsSection({ resultsRef, isSmall, isTablet, onClearSearchSilently, onClearSearch, onItem }: {
  resultsRef: React.RefObject<HTMLDivElement>; isSmall: boolean; isTablet: boolean; onClearSearchSilently: () => void; onClearSearch: () => void; onItem: (i: FoodItem) => void;
}) {
  const { sp, w, h } = useScreen();
  const { t } = useLanguage();
  const home = useHome();
  if (home.isSearchLoading) return <div style={{ display: "flex", justifyContent: "center", padding: h(40) }}><Spinner /></div>;
  if (home.searchResults.length === 0)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: `${h(60)}px 0` }}>
        <Icon name="search_off" size={sp(80)} color={C.textLight} />
        <div style={{ height: h(24) }} />
        <div style={{ fontSize: sp(20), fontWeight: 700, color: C.textDark }}>{t("homeNoResults")}</div>
        <div style={{ height: h(12) }} />
        <div style={{ fontSize: sp(14), color: C.textMedium }}>{t("homeNoResultsBody")}</div>
        <div style={{ height: h(24) }} />
        <Tap onClick={onClearSearch} style={{ display: "flex", alignItems: "center", padding: `${h(12)}px ${w(24)}px`, color: C.primary }}>
          <Icon name="clear_all" size={sp(20)} color={C.primary} /><span style={{ width: 8 }} />
          <span style={{ fontSize: sp(16), color: C.primary }}>{t("homeClearSearch")}</span>
        </Tap>
      </div>
    );
  const cols = isSmall ? 1 : isTablet ? 3 : 5, ratio = isSmall ? 1.1 : isTablet ? 0.8 : 0.75;
  const gapX = isSmall ? w(8) : isTablet ? w(16) : w(20), gapY = isSmall ? h(8) : isTablet ? h(16) : h(20);
  return (
    <div ref={resultsRef}>
      <div style={{ fontSize: sp(24), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("homeSearchResults")}</div>
      <div style={{ height: h(16) }} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gapX, rowGap: gapY }}>
        {home.searchResults.map((item) => (
          <div key={item.id} style={{ aspectRatio: String(ratio), minWidth: 0 }}><FoodItemCard foodItem={item} onTap={() => { onClearSearchSilently(); onItem(item); }} /></div>
        ))}
      </div>
    </div>
  );
}

function HomeMobileAppBar({ onClearSearchSilently, onClearSearch }: { onClearSearchSilently: () => void; onClearSearch: () => void }) {
  const { sp, w, h } = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const co = useCheckout();
  const { unreadCount } = useNotifications();
  const branchName = useBranchName();
  const label = (() => {
    const a = co.selectedAddress;
    if (a) {
      const lbl = a.type?.trim(), adr = a.address.trim();
      if (lbl && adr) return `${lbl} • ${adr}`;
      if (adr) return adr;
      if (lbl) return lbl;
    }
    if (branchName) return `${t("pickupLocation")}: ${branchName}`;
    if (co.selectedBranch) return `${t("pickupLocation")}: ${co.selectedBranch.name}`;
    return `${t("pickupLocation")}: Saborly Barcelona`;
  })();
  void checkoutStore;
  return (
    <header style={{ flex: "none", height: h(78), boxSizing: "border-box", background: C.surface, borderBottom: `1px solid ${C.divider}`, display: "flex", alignItems: "center", padding: "0 16px" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Tap onClick={() => { onClearSearch(); router.push(ROUTES.home); }} style={{ padding: `${h(2)}px ${w(2)}px` }}>
          <div style={{ maxHeight: h(48), maxWidth: w(140), aspectRatio: "3 / 1", height: h(48) > w(140) / 3 ? w(140) / 3 : h(48), position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/images/logo3.png" alt={t("appLogo")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </Tap>
        <div style={{ height: h(2) }} />
        <Tap onClick={() => router.push(ROUTES.branchChange)} style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <Icon name="location_on_outlined" size={sp(14)} color={C.secondary} /><span style={{ width: w(4) }} />
          <span style={{ fontSize: sp(11), fontWeight: 500, color: C.textMedium, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          <Icon name="keyboard_arrow_down_rounded" size={sp(16)} color={C.textMedium} />
        </Tap>
      </div>
      <div style={{ paddingRight: w(4) }}><LanguageSelector isCompact showLabel={false} /></div>
      <div style={{ position: "relative" }}>
        <Tap onClick={() => { onClearSearchSilently(); router.push(ROUTES.notifications); }} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="notifications_outlined" size={sp(24)} color={C.textDark} />
        </Tap>
        {unreadCount > 0 && (
          <span style={{ position: "absolute", right: 8, top: 8, padding: w(4), minWidth: w(16), minHeight: h(16), boxSizing: "border-box", borderRadius: "50%", background: "#F44336", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: sp(8), fontWeight: 700 }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </header>
  );
}
void body;
