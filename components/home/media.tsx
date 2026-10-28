"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { NetImage } from "@/components/ui/NetImage";
import { Tap, clamp } from "@/components/ui/primitives";
import { useBox } from "@/components/ui/useBox";
import { useRouter } from "next/navigation";
import { BannerModel, getActiveBanners } from "@/lib/banners";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { useOffers } from "@/lib/stores/offers";
import { OfferModel } from "@/lib/offerModels";
import { ROUTES } from "@/lib/nav";
import { SABORLY_VIDEOS, SaborlyVideo, formatVideoDuration, openReels, posterAsset, videoAsset } from "@/lib/videos";
import { useStore } from "@/lib/store";
import { reelsStore } from "@/lib/videos";

// ---------------- DynamicPromotionalBanner ----------------
const PROXY_BASE = "https://api.saborly.es/api/proxy";
const bannerImageUrl = (raw: string) => (raw.startsWith("http") ? `${PROXY_BASE}/image?url=${encodeURIComponent(raw)}` : raw);

export function DynamicPromotionalBanner({ autoPlayMs = 5000 }: { autoPlayMs?: number }) {
  const { ref, width } = useBox();
  const [banners, setBanners] = useState<BannerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hover, setHover] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const hoverRef = useRef(false); hoverRef.current = hover;
  const pageRef = useRef(0); pageRef.current = page;
  const drag = useRef<{ x: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);

  useEffect(() => {
    let on = true;
    void getActiveBanners().then((b) => {
      if (!on) return;
      setBanners(b); setLoading(false);
      if (b.length) {
        const img = new Image();
        img.onload = () => { if (img.width > 0 && img.height > 0) setRatio(img.width / img.height); };
        img.src = bannerImageUrl(b[0].imageUrl);
      }
    });
    return () => { on = false; };
  }, []);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => { if (!hoverRef.current) setPage((pageRef.current + 1) % banners.length); }, autoPlayMs);
    return () => clearInterval(t);
  }, [banners.length, autoPlayMs]);

  const isMobile = width < 768;
  const height = !isMobile ? (width >= 1400 ? 480 : width >= 1100 ? 400 : 340) : clamp(width / (ratio ?? 2), 200, 320);
  const radius = isMobile ? 16 : 32;
  const go = (i: number) => banners.length && setPage(((i % banners.length) + banners.length) % banners.length);

  return (
    <div ref={ref}>
      {width > 0 && loading && <BannerShimmer height={height} radius={radius} />}
      {width > 0 && !loading && banners.length > 0 && (
        <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
          transform: hover && !isMobile ? "scale(1.015)" : "scale(1)", transition: "transform 400ms cubic-bezier(.215,.61,.355,1)",
        }}>
          <div style={{ height, borderRadius: radius, boxShadow: `0 20px ${isMobile ? 20 : 45}px -10px ${withOpacity(C.primary, isMobile ? 0.05 : 0.15)}`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}
              onPointerDown={(e) => { drag.current = { x: e.clientX }; }}
              onPointerMove={(e) => { if (drag.current) setDragDx(e.clientX - drag.current.x); }}
              onPointerUp={() => { if (drag.current) { if (dragDx < -60) go(page + 1); else if (dragDx > 60) go(page - 1); } drag.current = null; setDragDx(0); }}
              onPointerLeave={() => { drag.current = null; setDragDx(0); }}>
              <div style={{ display: "flex", height: "100%", width: `${banners.length * 100}%`, transform: `translateX(calc(${-page * (100 / banners.length)}% + ${dragDx}px))`,
                transition: dragDx ? "none" : "transform 700ms cubic-bezier(.76,0,.24,1)" }}>
                {banners.map((b) => (
                  <div key={b.id} style={{ width: `${100 / banners.length}%`, height: "100%", position: "relative" }}>
                    {errored[b.id] ? (
                      <div style={{ position: "absolute", inset: 0, background: "#F9F1EA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="image_not_supported_outlined" size={48} color={C.textLight} />
                        <div style={{ height: 12 }} />
                        <div style={{ color: C.textLight, fontSize: 14 }}>Image unavailable</div>
                      </div>
                    ) : (
                      <NetImage src={bannerImageUrl(b.imageUrl)} placeholder="#FBF4EE" fadeMs={0}
                        error={<ErrorMark onError={() => setErrored((m) => ({ ...m, [b.id]: true }))} />} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(0deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 40%)" }} />
            </div>
            {banners.length > 1 && (
              <div style={{ position: "absolute", left: isMobile ? 16 : 24, right: isMobile ? 16 : 24, bottom: isMobile ? 16 : 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", padding: "8px 10px", background: "rgba(0,0,0,.2)", borderRadius: 20 }}>
                  {banners.map((b, i) => (
                    <Tap key={b.id} onClick={() => go(i)} style={{
                      margin: "0 4px", width: i === page ? 24 : 8, height: 4, borderRadius: 4, transition: "all 300ms cubic-bezier(.215,.61,.355,1)",
                      background: i === page ? "#fff" : "rgba(255,255,255,.4)" }} />
                  ))}
                </div>
                {!isMobile && (
                  <div style={{ display: "flex", gap: 12 }}>
                    {(["chevron_left_rounded", "chevron_right_rounded"] as const).map((ic, k) => (
                      <Tap key={ic} onClick={() => go(page + (k ? 1 : -1))} style={{
                        width: 44, height: 44, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.25)",
                        backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hover ? 1 : 0, transition: "opacity 300ms" }}>
                        <Icon name={ic} size={24} color="#fff" />
                      </Tap>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function ErrorMark({ onError }: { onError: () => void }) { useEffect(() => { onError(); }, [onError]); return null; }
function BannerShimmer({ height, radius }: { height: number; radius: number }) {
  return (
    <div style={{ height, width: "100%", borderRadius: radius, backgroundImage: "linear-gradient(135deg, #F7EFE8, #FBF4EE, #FFF9F3, #FBF4EE, #F7EFE8)", backgroundSize: "300% 300%", animation: "shimmerbg 1.8s linear infinite" }} />
  );
}

// ---------------- OffersSection ----------------
export function OffersSection({ header }: { header?: React.ReactNode }) {
  const o = useOffers();
  const { t } = useLanguage();
  const { ref, width } = useBox();
  const router = useRouter();
  const { sp, w, h, r } = useScreen();
  const offers = o.allOffers.slice(0, 2);
  const small = width < 600;
  const grid = (items: React.ReactNode) => (
    <div ref={ref} style={{ display: "grid", gridTemplateColumns: small ? "1fr" : "1fr 1fr", gap: 16 }}>{items}</div>
  );
  if (o.isLoading && o.allOffers.length === 0)
    return <div>{header}{grid([0, 1].map((i) => <div key={i} style={{ aspectRatio: small ? "2.2" : "2.5", background: C.shimmer, borderRadius: 20 }} />))}</div>;
  if (o.error && o.allOffers.length === 0)
    return (
      <div style={{ padding: w(16), background: "rgba(244,67,54,.1)", borderRadius: r(12), border: "1px solid rgba(244,67,54,.3)", display: "flex", alignItems: "center" }}>
        <Icon name="error_outline" size={sp(24)} color="#F44336" /><span style={{ width: w(12) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: sp(14), fontWeight: 600, color: "#B71C1C" }}>{t("failedToLoadOffers")}</div>
          <div style={{ height: h(4) }} />
          <div style={{ fontSize: sp(12), color: "#D32F2F" }}>{o.error ?? t("unknownError")}</div>
        </div>
        <Tap onClick={() => void import("@/lib/stores/offers").then((m) => m.loadOffers())} style={{ padding: "8px 12px", fontSize: sp(12), fontWeight: 600, color: C.primary }}>{t("retry")}</Tap>
      </div>
    );
  if (offers.length === 0) return null;
  return (
    <div>
      {header}
      {grid(offers.map((offer) => <OfferCard key={offer.id} offer={offer} onTap={() => router.push(ROUTES.offer)} />))}
      <span ref={undefined} />
    </div>
  );
}
function OfferCard({ offer, onTap }: { offer: OfferModel; onTap: () => void }) {
  const { sp, w, h, r } = useScreen();
  const { t } = useLanguage();
  const { ref, width } = useBox();
  const small = width < 600;
  const daysLeft = offer.expiryDate ? Math.trunc((offer.expiryDate.getTime() - Date.now()) / 86400_000) : null;
  return (
    <div ref={ref} onClick={onTap} style={{
      cursor: "pointer", position: "relative", aspectRatio: small ? "2.2" : "2.5", borderRadius: 20, background: `linear-gradient(135deg, ${offer.gradientColors[0]}, ${offer.gradientColors[1]})`,
      boxShadow: `0 4px 10px ${withOpacity(offer.gradientColors[0].startsWith("#") ? offer.gradientColors[0] : "#000000", 0.3)}`,
    }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden" }}>
        <NetImage src={offer.imageUrl ?? "https://via.placeholder.com/400x200.png?text=Offer"} placeholder={C.shimmer}
          error={<div style={{ position: "absolute", inset: 0, background: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="broken_image" size={sp(32)} color="#757575" /></div>} />
      </div>
      {offer.expiryDate && daysLeft != null && daysLeft >= 0 && (
        <div style={{ position: "absolute", top: h(12), left: w(16), display: "flex", alignItems: "center", padding: `${h(4)}px ${w(8)}px`, background: "rgba(255,255,255,.9)", borderRadius: r(8), boxShadow: "0 2px 4px rgba(0,0,0,.1)" }}>
          <Icon name="access_time" size={sp(12)} color={C.primary} /><span style={{ width: w(4) }} />
          <span style={{ fontSize: sp(10), fontWeight: 600, color: C.textDark }}>{daysLeft === 0 ? t("today") : t("days").replace("{days}", String(daysLeft))}</span>
        </div>
      )}
    </div>
  );
}

// ---------------- Video showcase ----------------
const VERTICAL_BLEED = 32;
export function VideoShowcaseSection({ isWeb }: { isWeb: boolean }) {
  const { ref, width } = useBox();
  const { t } = useLanguage();
  const scroller = useRef<HTMLDivElement>(null);
  const [canBack, setCanBack] = useState(false), [canFwd, setCanFwd] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open } = useStore(reelsStore);
  const videos = SABORLY_VIDEOS;
  const visibleCards = width < 600 ? 1.85 : width < 1000 ? 3.2 : 5.2;
  const gap = width < 600 ? 12 : 18;
  const cardWidth = (width - gap * Math.floor(visibleCards)) / visibleCards;
  const cardHeight = (cardWidth * 16) / 9;

  const update = useCallback(() => {
    const el = scroller.current; if (!el) return;
    setCanBack(el.scrollLeft > 4); setCanFwd(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);
  useEffect(() => { update(); }, [update, width, cardWidth]);
  useEffect(() => { if (open) setPreviewIdx(null); }, [open]);
  const scrollPage = (dir: number) => {
    const el = scroller.current; if (!el) return;
    el.scrollTo({ left: clamp(el.scrollLeft + dir * el.clientWidth * 0.8, 0, el.scrollWidth - el.clientWidth), behavior: "smooth" });
  };
  const onHover = (i: number, hovering: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (hovering) hoverTimer.current = setTimeout(() => setPreviewIdx(i), 350);
    else setPreviewIdx((cur) => (cur === i ? null : cur));
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  return (
    <div ref={ref}>
      {width > 0 && (
        <div style={{ position: "relative", height: cardHeight + VERTICAL_BLEED * 2 }}>
          <div ref={scroller} className="hide-scrollbar" onScroll={update} style={{ display: "flex", height: "100%", overflowX: "auto", padding: `${VERTICAL_BLEED}px 0`, boxSizing: "border-box", gap }}>
            {videos.map((v, i) => (
              <VideoCard key={v.id} video={v} width={cardWidth} height={cardHeight} preview={previewIdx === i} onHover={(hv) => onHover(i, hv)} onTap={() => openReels(videos, i)} />
            ))}
          </div>
          {isWeb && (["start", "end"] as const).map((side) => {
            const visible = side === "start" ? canBack : canFwd;
            return (
              <div key={side} style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: side === "start" ? 6 : undefined, insetInlineEnd: side === "end" ? 6 : undefined, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <Tap title={t(side === "start" ? "videoPrevious" : "videoNext")} onClick={() => scrollPage(side === "start" ? -1 : 1)} style={{
                  width: 46, height: 46, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: visible ? 1 : 0, transition: "opacity 200ms",
                  pointerEvents: visible ? "auto" : "none", boxShadow: "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px rgba(0,0,0,.14), 0 1px 18px rgba(0,0,0,.12)" }}>
                  <Icon name={side === "start" ? "chevron_left_rounded" : "chevron_right_rounded"} size={28} color={C.textDark} />
                </Tap>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SaborlyBadge({ size = 28, showName = false, nameSize = 14 }: { size?: number; showName?: boolean; nameSize?: number }) {
  const mono = (
    <div style={{ width: size, height: size, padding: size * 0.08, boxSizing: "border-box", borderRadius: "50%", flex: "none", background: `linear-gradient(135deg, ${C.secondary}, ${C.primary}, ${C.accentBerry})` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-bree), serif", fontSize: size * 0.52, lineHeight: 1, color: C.primary }}>S</div>
    </div>
  );
  if (!showName) return mono;
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {mono}<span style={{ width: size * 0.3 }} />
      <span style={{ fontSize: nameSize, fontWeight: 800, color: "#fff", textShadow: "0 0 6px rgba(0,0,0,.5)" }}>Saborly</span>
    </div>
  );
}

function VideoCard({ video, width, height, preview, onHover, onTap }: { video: SaborlyVideo; width: number; height: number; preview: boolean; onHover: (h: boolean) => void; onTap: () => void }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const radius = clamp(width * 0.1, 16, 24), playSize = clamp(width * 0.26, 42, 60), titleSize = clamp(width * 0.074, 13, 16), inset = clamp(width * 0.065, 10, 16);
  const set = (v: boolean) => { setHovered(v); onHover(v); };
  return (
    <div role="button" aria-label={`${t("videoPlay")}: ${t(video.titleKey)}`} onMouseEnter={() => set(true)} onMouseLeave={() => set(false)} onClick={onTap} style={{
      width, height, flex: "none", cursor: "pointer", borderRadius: radius, position: "relative", transition: "transform 220ms ease-out, box-shadow 220ms ease-out",
      transform: `translateY(${hovered ? -6 : 0}px)`, boxShadow: `0 ${hovered ? 14 : 7}px ${hovered ? 24 : 14}px ${withOpacity("#1A0803", hovered ? 0.42 : 0.24)}`,
    }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${hovered ? 1.05 : 1})`, transition: "transform 450ms cubic-bezier(.215,.61,.355,1)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterAsset(video)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          {preview && (
            <video src={videoAsset(video)} autoPlay muted loop playsInline onTimeUpdate={(e) => { const v = e.currentTarget; setProgress(v.duration ? v.currentTime / v.duration : 0); }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.4) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 45%, rgba(18,9,6,.7) 78%, rgba(18,9,6,.95) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, border: "1px solid rgba(255,255,255,.14)", boxSizing: "border-box" }} />
        <div style={{ position: "absolute", top: inset, insetInlineStart: inset, insetInlineEnd: inset, display: "flex", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0, display: "flex" }}>
            <span style={{ padding: "4px 9px", background: "rgba(255,255,255,.94)", borderRadius: 999, fontSize: 10, fontWeight: 800, color: C.primary, letterSpacing: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(video.tag).toUpperCase()}</span>
          </div>
          {preview && (<><span style={{ width: 6 }} /><div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="volume_off_rounded" size={14} color="#fff" /></div></>)}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ opacity: !preview || hovered ? 1 : 0, transition: "opacity 250ms" }}>
            <div style={{ width: playSize, height: playSize, borderRadius: "50%", boxSizing: "border-box", border: "2px solid rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center",
              background: hovered ? C.primary : "rgba(255,255,255,.92)", transform: `scale(${hovered ? 1.1 : 1})`, transition: "all 220ms", boxShadow: "0 6px 18px rgba(0,0,0,.25)" }}>
              <Icon name="play_arrow_rounded" size={playSize * 0.6} color={hovered ? "#fff" : C.primary} />
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", insetInlineStart: inset, insetInlineEnd: inset, bottom: inset }}>
          <SaborlyBadge size={20} showName nameSize={11.5} />
          <div style={{ height: 8 }} />
          <div style={{ fontSize: titleSize, fontWeight: 800, color: "#fff", lineHeight: 1.25, textShadow: "0 0 8px rgba(0,0,0,.5)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t(video.titleKey)}</div>
          <div style={{ height: 6 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <Icon name="play_circle_fill_rounded" size={14} color={C.secondary} /><span style={{ width: 4 }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.85)", fontVariantNumeric: "tabular-nums" }}>{formatVideoDuration(video.durationSec)}</span>
          </div>
        </div>
        {preview && <div style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})` }} />}
      </div>
    </div>
  );
}
