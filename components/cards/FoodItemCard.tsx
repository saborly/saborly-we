"use client";
import { useState } from "react";
import { C, G, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap, fmt2 } from "@/components/ui/primitives";
import { useBox } from "@/components/ui/useBox";
import { PLATFORM, addPlainItemToCart, needsCustomization } from "@/lib/cartActions";
import {
  FoodItem, discountPercentageForPlatform, effectivePriceForPlatform, hasActiveOfferForPlatform,
} from "@/lib/models";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { CardSize, cardSizeFor, makeSizing, useCompactFooter } from "./cardSizing";

/** Port of FoodItemCard (+ image/details/add-button/price/meta-chip sub-widgets). Fills its grid cell. */
export function FoodItemCard({ foodItem, onTap, showDescription = false }: { foodItem: FoodItem; onTap: () => void; showDescription?: boolean }) {
  const u = useScreen();
  const { width: screenWidth } = u;
  const { ref, width, height, measured } = useBox();
  const cardSize = cardSizeFor(width, height);
  const compact = useCompactFooter(cardSize);
  const S = makeSizing(u, screenWidth);
  const radius = S.getBorderRadius(cardSize);
  const mH = u.w(S.R(4, 6, 8)), mV = u.h(S.R(4, 6, 8));

  return (
    <div ref={ref} style={{ width: "100%", height: "100%", cursor: "pointer" }} onClick={onTap}>
      {measured && (
        <div style={{
          margin: `${mV}px ${mH}px`, height: `calc(100% - ${2 * mV}px)`, boxSizing: "border-box", position: "relative", overflow: "hidden",
          background: "linear-gradient(180deg, #FFFFFF, #FFFAF4, #FFF2E4)", borderRadius: radius, border: "1.4px solid rgba(255,255,255,.96)",
          boxShadow: `0 ${u.h(12)}px ${u.r(26)}px ${-u.r(8)}px ${withOpacity("#1A0803", 0.18)}, 0 ${u.h(4)}px ${u.r(12)}px ${-u.r(6)}px ${withOpacity(C.primary, 0.08)}`,
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ position: "absolute", top: -u.h(20), right: -u.w(8), width: u.w(88), height: u.w(88), borderRadius: "50%", background: withOpacity(C.secondary, 0.08) }} />
          <div style={{ flex: compact ? 5 : 11, minHeight: 0, position: "relative" }}>
            <ImageSection item={foodItem} cardSize={cardSize} S={S} u={u} />
          </div>
          <div style={{ flex: compact ? 15 : 9, minHeight: 0, position: "relative" }}>
            <Details item={foodItem} cardSize={cardSize} S={S} u={u} showDescription={showDescription} onTap={onTap} />
          </div>
        </div>
      )}
    </div>
  );
}
type Sizing = ReturnType<typeof makeSizing>;
type U = ReturnType<typeof useScreen>;

function ImageSection({ item, cardSize, S, u }: { item: FoodItem; cardSize: CardSize; S: Sizing; u: U }) {
  const { t } = useLanguage();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const hasOffer = hasActiveOfferForPlatform(item, PLATFORM);
  const discount = discountPercentageForPlatform(item, PLATFORM);
  const url = item.imageUrl || `https://picsum.photos/200/200?random=${item.id}`;
  const pad = S.getPadding(cardSize);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onLoad={() => setState("ok")} onError={() => setState("error")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: state === "error" ? "none" : "block" }} />
      {state === "loading" && (
        <div style={{ position: "absolute", inset: 0, background: C.shimmer, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spinner size={36} stroke={2.5} color={C.primaryDark} />
        </div>
      )}
      {state === "error" && (
        <div style={{ position: "absolute", inset: 0, background: C.shimmer, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Icon name="fastfood" size={S.getIconSize(cardSize) * 1.5} color={C.textLight} />
          {cardSize !== "extraSmall" && (<>
            <div style={{ height: u.h(8) }} />
            <div style={{ textAlign: "center", fontSize: S.getSmallFontSize(cardSize), color: C.textLight }}>{t("imageNotAvailable")}</div>
          </>)}
        </div>
      )}
      <div style={{
        position: "absolute", top: pad, left: pad, padding: S.getSmallPadding(cardSize) * 1.5, borderRadius: u.r(10), background: "rgba(255,255,255,.95)",
        boxShadow: `0 ${u.h(2)}px ${u.r(4)}px rgba(0,0,0,.08)`, display: "flex",
      }}>
        <Icon name="circle" size={S.getSmallIconSize(cardSize)} color={item.isVeg ? "#4CAF50" : "#F44336"} />
      </div>
      {hasOffer && (
        <div style={{
          position: "absolute", top: pad, right: pad, maxWidth: u.width >= 600 ? u.w(120) : u.w(104), display: "flex", alignItems: "center",
          padding: `${S.getSmallPadding(cardSize) * 1.5}px ${pad * 0.9}px`, borderRadius: u.r(14),
          background: `linear-gradient(135deg, ${C.accentBerry}, ${C.primary})`, boxShadow: `0 ${u.h(5)}px ${u.r(10)}px ${withOpacity(C.accentBerry, 0.28)}`,
        }}>
          <Icon name="local_offer" size={S.getSmallIconSize(cardSize)} color="#fff" />
          <span style={{ width: u.w(4) }} />
          <span style={{ fontSize: S.getSmallFontSize(cardSize), fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.offer?.badge ?? `${discount}% OFF`}
          </span>
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, icon, cardSize, S, u, bg, fg }: { label: string; icon: string; cardSize: CardSize; S: Sizing; u: U; bg: string; fg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", minWidth: 0, background: bg, borderRadius: 999, border: `1px solid ${withOpacity(fg, 0.12)}`,
      padding: `${S.getSmallPadding(cardSize) * 1.35}px ${S.getSmallPadding(cardSize) * 2.8}px`,
    }}>
      <Icon name={icon} size={S.getSmallIconSize(cardSize)} color={fg} />
      <span style={{ width: u.w(4) }} />
      <span style={{ fontSize: S.getSmallFontSize(cardSize), fontWeight: 700, color: fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </span>
  );
}

function Details({ item, cardSize, S, u, showDescription, onTap }: { item: FoodItem; cardSize: CardSize; S: Sizing; u: U; showDescription: boolean; onTap: () => void }) {
  const { t } = useLanguage();
  const compact = useCompactFooter(cardSize);
  const pad = S.getPadding(cardSize), spacing = S.getSpacing(cardSize);
  const hasOffer = hasActiveOfferForPlatform(item, PLATFORM);
  const eff = effectivePriceForPlatform(item, PLATFORM);
  const clampLines = (n: number): React.CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });
  const title = (lines: number) => (
    <div style={{ fontSize: S.getTitleFontSize(cardSize), fontWeight: 800, color: C.textDark, lineHeight: 1.2, ...clampLines(lines) }}>{item.name}</div>
  );
  const desc = (lines: number) => (
    <div style={{ marginTop: spacing * 0.45, fontSize: S.getDescriptionFontSize(cardSize), color: C.textLight, lineHeight: 1.25, ...clampLines(lines) }}>{item.description}</div>
  );
  let header: React.ReactNode;
  if (showDescription) {
    header = u.width < 600
      ? <div style={{ overflow: "hidden", flex: "0 1 auto", minHeight: 0 }}>{title(compact ? 1 : 2)}{cardSize !== "extraSmall" && desc(compact ? 2 : 3)}</div>
      : <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{title(compact ? 1 : 2)}{cardSize !== "extraSmall" && desc(1)}</div>;
  } else {
    header = <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{title(compact ? 1 : 2)}</div>;
  }
  const priceBlock = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {hasOffer && (<>
        <div style={{ fontSize: S.getSmallFontSize(cardSize), color: C.textLight, textDecoration: "line-through", textDecorationThickness: 2, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("currency")}{fmt2(item.price)}</div>
        <div style={{ height: u.h(2) }} />
      </>)}
      <div style={{ fontSize: S.getPriceFontSize(cardSize), fontWeight: 800, color: C.primaryDark, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("currency")}{fmt2(eff)}</div>
    </div>
  );
  return (
    <div style={{
      position: "absolute", inset: 0, boxSizing: "border-box", display: "flex", flexDirection: "column",
      padding: `${pad}px ${pad}px ${compact ? pad * 0.75 : pad + u.h(1)}px`,
    }}>
      {header}
      {!compact && (
        <>
          <div style={{ height: spacing * 0.45 }} />
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <div style={{ flex: "0 1 auto", minWidth: 0, display: "flex" }}>
              <MetaChip label={item.isVeg ? "Veg choice" : "Chef pick"} icon={item.isVeg ? "eco" : "restaurant"} cardSize={cardSize} S={S} u={u} bg={C.accentCream} fg={C.primaryDark} />
            </div>
            {(item.isFeatured || item.isPopular) && (<>
              <span style={{ width: u.w(6) }} />
              <div style={{ flex: "0 1 auto", minWidth: 0, display: "flex" }}>
                <MetaChip label={item.isFeatured ? t("featured") : t("popular")} icon={item.isFeatured ? "star" : "local_fire_department"} cardSize={cardSize} S={S} u={u}
                  bg={item.isFeatured ? "#FDE7C3" : "#FCD9CC"} fg={item.isFeatured ? "#9A5A00" : "#B93812"} />
              </div>
            </>)}
          </div>
        </>
      )}
      <div style={{ height: spacing * 0.35 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {priceBlock}
        <span style={{ width: compact ? spacing * 0.75 : spacing * 1.3 }} />
        <AddButton item={item} cardSize={cardSize} S={S} u={u} onTap={onTap} />
      </div>
    </div>
  );
}

function AddButton({ item, cardSize, S, u, onTap }: { item: FoodItem; cardSize: CardSize; S: Sizing; u: U; onTap: () => void }) {
  const { t } = useLanguage();
  const compact = useCompactFooter(cardSize);
  return (
    <Tap onClick={(e) => { e.stopPropagation(); if (needsCustomization(item)) onTap(); else addPlainItemToCart(item, "card"); }} style={{
      minHeight: compact ? u.h(32) : u.h(36), minWidth: compact ? 0 : u.w(84), boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center",
      padding: `${S.getSmallPadding(cardSize) * (compact ? 1.65 : 2.1)}px ${S.getPadding(cardSize) * (compact ? 0.95 : 1.2)}px`,
      borderRadius: u.r(16), background: G.primary, boxShadow: `0 ${u.h(8)}px ${u.r(16)}px ${-u.r(6)}px ${withOpacity(C.primary, 0.22)}`,
    }}>
      <Icon name="add" size={S.getButtonFontSize(cardSize)} color="#fff" />
      <span style={{ width: u.w(4) }} />
      <span style={{ fontSize: S.getButtonFontSize(cardSize), fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("add")}</span>
    </Tap>
  );
}
