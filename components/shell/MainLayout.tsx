"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Tap, fmt2 } from "@/components/ui/primitives";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { useCart } from "@/lib/stores/cart";
import { checkoutStore, loadBranches } from "@/lib/stores/commerce";
import { ROUTES, shouldHideChrome } from "@/lib/nav";
import { useBranchName } from "@/lib/useBranchName";
import { LanguageSelector } from "./LanguageSelector";
import { SearchBar } from "./SearchBar";

interface NavItem { icon: string; activeIcon: string; label: string; route: string; isCart?: boolean }

function useNavItems() {
  const { t } = useLanguage();
  const desktop: NavItem[] = [
    { icon: "home_outlined", activeIcon: "home", label: t("home"), route: ROUTES.home },
    { icon: "restaurant_menu_outlined", activeIcon: "restaurant_menu", label: t("menu"), route: ROUTES.menu },
    { icon: "local_offer_outlined", activeIcon: "local_offer", label: t("offers"), route: ROUTES.offer },
    { icon: "info_outline", activeIcon: "info", label: t("aboutUs"), route: ROUTES.about },
    { icon: "contact_page_outlined", activeIcon: "contact_page", label: t("contactUs"), route: ROUTES.contact },
  ];
  const mobile: NavItem[] = [
    { icon: "home_outlined", activeIcon: "home", label: t("home"), route: ROUTES.home },
    { icon: "restaurant_menu_outlined", activeIcon: "restaurant_menu", label: t("menu"), route: ROUTES.menu },
    { icon: "shopping_cart_outlined", activeIcon: "shopping_cart", label: t("cart"), route: ROUTES.cart, isCart: true },
    { icon: "local_offer_outlined", activeIcon: "local_offer", label: t("offers"), route: ROUTES.offer },
    { icon: "person_outline", activeIcon: "person", label: t("profile"), route: ROUTES.profile },
  ];
  return { desktop, mobile };
}

export function MainLayout({ children }: { children: ReactNode }) {
  const path = usePathname() || "";
  const router = useRouter();
  const { width, rv } = useScreen();
  const isSmall = width < 600, isTablet = width >= 600 && width < 1200, isDesktop = width >= 1200;
  const hide = shouldHideChrome(path);
  const showBottomNav = !isDesktop && !hide;
  const showAppBar = (isDesktop || isTablet) && !hide;
  const { desktop, mobile } = useNavItems();
  const cart = useCart();

  useEffect(() => { if (checkoutStore.state.branches.length === 0) void loadBranches(); }, []);

  const selectedIndex = (items: NavItem[]) => items.findIndex((i) => i.route === path);
  const go = (route: string) => router.push(route);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.background, overflow: "hidden", position: "relative" }}>
      {showAppBar && (
        <AppBar isDesktop={isDesktop} toolbarHeight={rv(60, 64, 72)}
          items={desktop} selected={selectedIndex(desktop)} onTap={(i) => go(desktop[i].route)}
          showLanguageSelector={path === ROUTES.home || path === "/" || path === ""} />
      )}
      <div id="main-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", justifyContent: "center", position: "relative" }}>
        <div style={{ width: "100%", maxWidth: isDesktop ? 1980 : undefined, minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
      {showBottomNav && (
        <BottomNav isSmall={isSmall} items={isSmall ? mobile : desktop} selected={selectedIndex(isSmall ? mobile : desktop)}
          onTap={(i) => go((isSmall ? mobile : desktop)[i].route)} />
      )}
      {isTablet && !isDesktop && showBottomNav && !cart.isEmpty && (
        <div style={{ position: "absolute", right: 16, bottom: rv(62, 66, 70) + 16 + 80 }}>
          <CartFab onClick={() => go(ROUTES.cart)} />
        </div>
      )}
    </div>
  );
}

// ---------------- AppBar ----------------
function AppBar({ isDesktop, toolbarHeight, items, selected, onTap, showLanguageSelector }: {
  isDesktop: boolean; toolbarHeight: number; items: NavItem[]; selected: number;
  onTap: (i: number) => void; showLanguageSelector: boolean;
}) {
  const { width, rv } = useScreen();
  return (
    <header className="bree-scope" style={{ height: toolbarHeight, flex: "none", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.06)", position: "relative", zIndex: 5 }}>
      {/* AppBar.titleTextStyle = Bree Serif: every Text inside the title inherits it (nav labels, cart total, Account) */}
      <div style={{
        fontFamily: "var(--font-bree), serif", width, maxWidth: isDesktop ? 1700 : width, height: "100%", boxSizing: "border-box", padding: `0 ${rv(8, 12, 16)}px`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Flexible(flex: n) children are *loose*: content-sized but capped at their flex share of the row */}
        {(() => {
          const total = isDesktop ? 10 : 7;
          const cap = (n: number) => `${(n / total) * 100}%`;
          return (
            <>
              <div style={{ flex: "0 1 auto", minWidth: 0, maxWidth: cap(isDesktop ? 1.5 : 3), display: "flex" }}><Logo /></div>
              {isDesktop && <div style={{ flex: "0 1 auto", minWidth: 0, maxWidth: cap(4.6) }}><DesktopNav items={items} selected={selected} onTap={onTap} /></div>}
              <div style={{ flex: "0 1 auto", minWidth: 0, maxWidth: cap(isDesktop ? 3.9 : 4) }}>
                <RightSection isDesktop={isDesktop} showLanguageSelector={showLanguageSelector} />
              </div>
            </>
          );
        })()}
      </div>
    </header>
  );
}

function Logo() {
  const { rv } = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const lw = rv(100, 120, 140), lh = rv(40, 45, 50), pad = rv(4, 6, 10);
  return (
    <div style={{ padding: `0 ${pad}px` }}>
      <Tap onClick={() => router.push(ROUTES.home)} style={{ width: lw, height: lh, position: "relative", transition: "all 200ms" }}>
        <Image src="/assets/images/logo3.png" alt={t("appLogo")} fill sizes="140px" style={{ objectFit: "contain" }} priority />
      </Tap>
    </div>
  );
}

function DesktopNav({ items, selected, onTap }: { items: NavItem[]; selected: number; onTap: (i: number) => void }) {
  const { rv, width } = useScreen();
  const tight = width < 1400; // leave room for the branch pill, search and account on narrower desktops
  const iconSize = tight ? 18 : rv(18, 20, 22), fontSize = tight ? 15 : rv(14, 16, 18), hp = tight ? 2 : rv(4, 8, 12);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {items.map((item, i) => {
          const sel = selected === i;
          return (
            <div key={item.route} style={{ padding: `0 ${hp}px` }}>
              <Tap onClick={() => onTap(i)} style={{
                padding: "8px 8px", borderRadius: 8, display: "flex", alignItems: "center",
                background: sel ? withOpacity(C.primary, 0.08) : "transparent",
              }}>
                <Icon name={sel ? item.activeIcon : item.icon} size={iconSize} color={sel ? C.primary : C.textDark} />
                <span style={{ width: 6 }} />
                <span style={{
                  fontSize, fontWeight: sel ? 600 : 500, color: sel ? C.primary : C.textDark, letterSpacing: 0.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{item.label}</span>
              </Tap>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RightSection({ isDesktop, showLanguageSelector }: { isDesktop: boolean; showLanguageSelector: boolean }) {
  const { rv, width } = useScreen();
  const router = useRouter();
  const spacing = rv(4, 6, 7);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
      {isDesktop && (
        <>
          <BranchButton />
          <span style={{ width: spacing }} />
          {width < 1700 ? (
            // not enough room for the full search field next to the branch pill: icon button that opens search
            <Tap onClick={() => router.push(ROUTES.search)} ariaLabel="Search" title="Search" style={{ width: 40, height: 40, borderRadius: 20, background: withOpacity(C.primary, 0.08), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="search" size={20} color={C.primary} />
            </Tap>
          ) : (
            <div style={{ flex: "0 1 289px", maxWidth: 289, minWidth: 0, width: 289 }} onClick={() => router.push(ROUTES.search)}>
              <div style={{ pointerEvents: "none" }}><SearchBar onSearch={() => {}} /></div>
            </div>
          )}
          <span style={{ width: spacing }} />
        </>
      )}
      {showLanguageSelector && (<><LanguageSelector isCompact /><span style={{ width: spacing }} /></>)}
      <CartButton />
      <span style={{ width: spacing }} />
      <AccountButton />
    </div>
  );
}

function BranchButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const name = useBranchName();
  // Single compact line so the pill never squeezes the search box: pin + branch name (+ chevron); the full label is in the tooltip.
  return (
    <Tap onClick={() => router.push(ROUTES.branchChange)} title={`${t("pickupLocation")}: ${name ?? "Saborly"}`} style={{
      padding: "8px 12px", borderRadius: 20, background: "#F6F7F9", border: "1px solid #E5E7EB", display: "flex", alignItems: "center",
      flex: "0 0 auto", maxWidth: 190, minWidth: 0, fontFamily: "var(--font-manrope), sans-serif",
    }}>
      <Icon name="location_on_outlined" size={18} color={C.primary} />
      <span style={{ width: 6 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textDark, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>{name ?? "Saborly"}</span>
      <span style={{ width: 2 }} />
      <Icon name="keyboard_arrow_down_rounded" size={18} color={C.textLight} />
    </Tap>
  );
}

function CartButton() {
  const { rv } = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const cart = useCart();
  const hp = rv(10, 12, 14), icon = rv(18, 20, 22), fs = rv(13, 14, 15), badge = rv(14, 16, 18), bfs = rv(8, 8.5, 9);
  return (
    <Tap onClick={() => router.push(ROUTES.cart)} style={{
      padding: `8px ${hp}px`, borderRadius: 20, background: withOpacity(C.primary, 0.08), display: "flex", alignItems: "center", flex: "none",
      fontFamily: "var(--font-manrope), sans-serif", // inside Material(): DefaultTextStyle is textTheme.bodyMedium (Manrope), not the AppBar title's Bree Serif
    }}>
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Icon name="shopping_cart_rounded" size={icon} color={C.primary} />
        {!cart.isEmpty && (
          <span style={{
            position: "absolute", right: -6, top: -6, padding: 4, background: "#E53935", borderRadius: "50%", boxSizing: "border-box",
            minWidth: badge, minHeight: badge, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 4px 1px rgba(244,67,54,.4)", color: "#fff", fontSize: bfs, fontWeight: 700, textAlign: "center",
          }}>{cart.totalQuantity}</span>
        )}
      </span>
      <span style={{ width: 8 }} />
      <span style={{ fontSize: fs, fontWeight: 700, color: C.primary, whiteSpace: "nowrap" }}>{t("currency")}{fmt2(cart.total)}</span>
    </Tap>
  );
}

function AccountButton() {
  const { rv } = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const hp = rv(12, 14, 16), icon = rv(16, 17, 18), fs = rv(12, 13, 14);
  return (
    <Tap onClick={() => router.push(ROUTES.profile)} style={{
      padding: `10px ${hp}px`, borderRadius: 22, display: "flex", alignItems: "center", flex: "none", fontFamily: "var(--font-manrope), sans-serif",
      background: `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.85)})`,
      boxShadow: `0 4px 8px ${withOpacity(C.primary, 0.3)}`,
    }}>
      <Icon name="person_rounded" size={icon} color="#fff" />
      <span style={{ width: 6 }} />
      <span style={{ fontSize: fs, fontWeight: 500, color: "#fff", whiteSpace: "nowrap" }}>{t("account")}</span>
    </Tap>
  );
}

// ---------------- Bottom navigation ----------------
function BottomNav({ isSmall, items, selected, onTap }: { isSmall: boolean; items: NavItem[]; selected: number; onTap: (i: number) => void }) {
  const { rv } = useScreen();
  const cart = useCart();
  const navH = rv(62, 66, 70), hp = rv(8, 16, 24);
  const iconSize = rv(22, 24, 24), fs = rv(10, 10.5, 11), badge = rv(14, 15, 16), bfs = rv(7.5, 8, 8);
  void isSmall;
  return (
    <nav style={{ flex: "none", background: "#fff", boxShadow: "0 -4px 16px rgba(0,0,0,.08)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ height: navH, boxSizing: "border-box", padding: `8px ${hp}px`, display: "flex", justifyContent: "space-around" }}>
        {items.map((item, i) => {
          const sel = selected === i;
          const color = sel ? C.primary : C.textLight;
          return (
            <div key={item.route} style={{ flex: 1, minWidth: 0, display: "flex" }}>
              <Tap onClick={() => onTap(i)} style={{
                flex: 1, padding: "4px 4px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", transition: "background 200ms", background: sel ? withOpacity(C.primary, 0.08) : "transparent", minWidth: 0,
              }}>
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Icon name={sel ? item.activeIcon : item.icon} size={iconSize} color={color} />
                  {item.isCart && !cart.isEmpty && (
                    <span style={{
                      position: "absolute", right: -8, top: -6, padding: 3, background: "#E53935", borderRadius: "50%", boxSizing: "border-box",
                      minWidth: badge, minHeight: badge, display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 4px 1px rgba(244,67,54,.4)", color: "#fff", fontSize: bfs, fontWeight: 700,
                    }}>{cart.totalQuantity}</span>
                  )}
                </span>
                <span style={{ height: 3 }} />
                <span style={{ fontSize: fs, fontWeight: sel ? 600 : 500, color, letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label}</span>
              </Tap>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function CartFab({ onClick }: { onClick: () => void }) {
  const { sp, w, h } = useScreen();
  const { t } = useLanguage();
  const cart = useCart();
  return (
    <Tap onClick={onClick} style={{
      height: 56, padding: "0 20px", borderRadius: 24, background: C.primary, color: "#fff", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)",
    }}>
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Icon name="shopping_cart_rounded" size={sp(20)} color="#fff" />
        <span style={{
          position: "absolute", right: -10, top: -8, padding: 3, background: "#fff", borderRadius: "50%", boxSizing: "border-box",
          minWidth: w(16), minHeight: h(16), display: "flex", alignItems: "center", justifyContent: "center",
          color: C.primary, fontSize: sp(9), fontWeight: 700,
        }}>{cart.totalQuantity}</span>
      </span>
      <span style={{ fontSize: sp(14), fontWeight: 700 }}>{t("currency")}{fmt2(cart.total)}</span>
    </Tap>
  );
}
