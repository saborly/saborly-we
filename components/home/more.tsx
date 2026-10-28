"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C, G, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Dialog, Spinner, Tap, fmt2 } from "@/components/ui/primitives";
import { useBox } from "@/components/ui/useBox";
import {
  GooglePlaceSummary, OpenStatus, loadGooglePlaces, openStatusDetail, openStatusEquals, openStatusNow,
} from "@/lib/googlePlaces";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { body } from "./parts";

// ---------------- Google reviews ----------------
export function WebGoogleReviewsSection({ header }: { header?: ReactNode }) {
  const u = useScreen();
  const [places, setPlaces] = useState<GooglePlaceSummary[] | null>(null);
  const [status, setStatus] = useState<OpenStatus>(openStatusNow());
  const { ref, width } = useBox();
  useEffect(() => { let on = true; void loadGooglePlaces().then((p) => on && setPlaces(p)); return () => { on = false; }; }, []);
  useEffect(() => {
    const t = setInterval(() => { const n = openStatusNow(); setStatus((cur) => (openStatusEquals(cur, n) ? cur : n)); }, 30_000);
    return () => clearInterval(t);
  }, []);
  const wrap = (child: ReactNode) => <div>{header}{child}</div>;
  if (places == null) return wrap(<div style={{ height: u.h(220), display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>);
  if (places.length === 0) return null;
  const columns = width > 900 ? 2 : 1, gap = 20;
  return wrap(
    <div ref={ref} style={{ display: "flex", flexWrap: "wrap", columnGap: gap, rowGap: 16 }}>
      {width > 0 && places.map((p, i) => (
        <div key={i} style={{ width: columns === 1 ? width : (width - gap) / 2 }}><PlaceCard place={p} status={status} /></div>
      ))}
    </div>,
  );
}

function PlaceCard({ place, status }: { place: GooglePlaceSummary; status: OpenStatus }) {
  const u = useScreen();
  const { t, language } = useLanguage();
  const [dialog, setDialog] = useState(false);
  const { ref, width } = useBox();
  const quote = place.reviews[0] ?? null;
  const detail = openStatusDetail(status, language);
  const meta = body(12.5, { color: C.muted, weight: 600, height: 1.3 }, u);
  const belowName = width < 420;
  const [label, color] = status.state === "open" ? [t("homeOpenNow"), C.accentLeaf] : status.state === "closingSoon" ? [t("homeClosingSoon"), C.warning] : [t("homeClosed"), C.error];
  const badge = (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 10px", background: withOpacity(color, 0.12), borderRadius: 999, flex: "none" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} /><span style={{ width: 5 }} />
      <span style={body(11.5, { color, weight: 800, height: 1.2 }, u)}>{label}</span>
    </div>
  );
  return (
    <div ref={ref} style={{ boxSizing: "border-box", padding: 20, background: C.surface, borderRadius: 20, border: `1px solid ${withOpacity(C.border, 0.55)}`, boxShadow: `0 5px 14px ${withOpacity("#1A0803", 0.05)}` }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: C.premiumAccent, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name="storefront_rounded" size={22} color={C.primary} />
        </div>
        <span style={{ width: 12 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...body(16, { color: C.textDark, weight: 800, height: 1.3 }, u), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{place.name}</div>
          <div style={{ height: 2 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <Icon name="location_on_outlined" size={u.size(13)} color={C.muted} /><span style={{ width: 3 }} />
            <span style={{ ...body(12.5, { color: C.muted, height: 1.3 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.location}</span>
          </div>
          {belowName && (<><div style={{ height: 8 }} />{badge}</>)}
        </div>
        {!belowName && (<><span style={{ width: 8 }} />{badge}</>)}
      </div>
      <div style={{ height: 14 }} />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 6 }}>
        {place.rating != null && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Icon name="star_rounded" size={u.size(16)} color={C.secondary} /><span style={{ width: 4 }} />
            <span style={body(13.5, { color: C.textDark, weight: 800, height: 1.3 }, u)}>{place.rating.toFixed(1)}</span><span style={{ width: 4 }} />
            <span style={meta}>({place.reviewCount})</span>
          </div>
        )}
        {place.priceRange != null && <span style={meta}>{place.priceRange}</span>}
        <span style={{ ...meta, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.category}</span>
        {detail && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Icon name="schedule_rounded" size={u.size(14)} color={C.muted} /><span style={{ width: 4 }} /><span style={meta}>{detail}</span>
          </div>
        )}
      </div>
      {quote && (
        <>
          <div style={{ height: 14 }} />
          <div style={{ width: "100%", boxSizing: "border-box", padding: 14, background: C.premiumAccent, borderRadius: 14 }}>
            <div style={{ display: "flex" }}>{Array.from({ length: quote.rating }).map((_, i) => <Icon key={i} name="star_rounded" size={u.size(14)} color={C.secondary} />)}</div>
            <div style={{ height: 6 }} />
            <div style={{ ...body(13.5, { color: C.textDark, height: 1.45 }, u), fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>&quot;{quote.text}&quot;</div>
            <div style={{ height: 6 }} />
            <div style={body(12, { color: C.muted, weight: 700, height: 1.3 }, u)}>— {quote.author}</div>
          </div>
        </>
      )}
      {place.reviews.length > 1 && (
        <>
          <div style={{ height: 12 }} />
          <Tap onClick={() => setDialog(true)} style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={body(13, { color: C.primary, weight: 800, height: 1.3 }, u)}>{t("homeReadMoreReviews")}</span><span style={{ width: 4 }} />
            <Icon name="arrow_forward_rounded" size={u.size(15)} color={C.primary} />
          </Tap>
        </>
      )}
      <AllReviewsDialog open={dialog} place={place} onClose={() => setDialog(false)} />
    </div>
  );
}

function AllReviewsDialog({ open, place, onClose }: { open: boolean; place: GooglePlaceSummary; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(3);
  if (!open) return null;
  const sorted = [...place.reviews].sort((a, b) => b.rating - a.rating);
  const shown = sorted.slice(0, visible), hasMore = visible < sorted.length;
  return (
    <Dialog open onClose={onClose}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: u.height * 0.8, background: "#fff", borderRadius: 24, display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "22px 16px 16px 24px", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={body(18, { color: C.textDark, weight: 800, height: 1.3 }, u)}>{place.name}</div>
            <div style={{ height: 4 }} />
            <div style={{ display: "flex", alignItems: "center" }}>
              {place.rating != null && (<><Icon name="star_rounded" size={u.size(15)} color={C.secondary} /><span style={{ width: 3 }} /><span style={body(13, { color: C.textDark, weight: 700, height: 1.3 }, u)}>{place.rating.toFixed(1)}</span><span style={{ width: 6 }} /></>)}
              <span style={body(12.5, { color: C.muted, height: 1.3 }, u)}>{t("homeGoogleReviewsCount").replace("{count}", String(place.reviewCount))}</span>
            </div>
          </div>
          <Tap onClick={onClose} style={{ padding: 8, display: "flex" }}><Icon name="close_rounded" size={24} color={C.textMedium} /></Tap>
        </div>
        <div style={{ height: 1, background: C.divider }} />
        <div style={{ overflowY: "auto", padding: 20 }}>
          {shown.map((r, i) => (
            <div key={i}>
              {i > 0 && <div style={{ padding: "16px 0" }}><div style={{ height: 1, background: C.divider }} /></div>}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.premiumAccent, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.authorPhoto ? <img src={r.authorPhoto} alt="" width={40} height={40} style={{ objectFit: "cover" }} /> : <span style={body(14, { color: C.primary, weight: 800 }, u)}>{r.author ? r.author[0].toUpperCase() : "?"}</span>}
                </div>
                <span style={{ width: 14 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex" }}>
                    <span style={{ flex: 1, ...body(13.5, { color: C.textDark, weight: 800, height: 1.3 }, u), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.author}</span>
                    {r.relativeTime && <span style={body(12, { color: C.muted, height: 1.3 }, u)}>{r.relativeTime}</span>}
                  </div>
                  <div style={{ height: 4 }} />
                  <div style={{ display: "flex" }}>{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} name="star_rounded" size={u.size(14)} color={C.secondary} />)}</div>
                  <div style={{ height: 8 }} />
                  <div style={body(13.5, { color: C.textDark, height: 1.5 }, u)}>{r.text}</div>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <Tap onClick={() => setVisible((v) => v + 3)} style={{ display: "flex", alignItems: "center", padding: "8px 12px", color: C.primary }}>
                <span style={body(13.5, { weight: 800, height: 1.3, color: C.primary }, u)}>{t("homeLoadMore")}</span><span style={{ width: 6 }} />
                <Icon name="keyboard_arrow_down_rounded" size={u.size(18)} color={C.primary} />
              </Tap>
            </div>
          )}
        </div>
        {place.mapsUrl && (
          <>
            <div style={{ height: 1, background: C.divider }} />
            <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ padding: 16, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Icon name="open_in_new_rounded" size={u.size(15)} color={C.primary} /><span style={{ width: 8 }} />
              <span style={body(13.5, { color: C.primary, weight: 800, height: 1.3 }, u)}>{t("homeSeeAllOnGoogle")}</span>
            </a>
          </>
        )}
      </div>
    </Dialog>
  );
}

// ---------------- Footer ----------------
export function FoodKingFooter() {
  const { width } = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const isDesktop = width >= 1200, isTablet = width >= 768 && width < 1200;
  const padV = isDesktop ? 48 : isTablet ? 40 : 32, padH = isDesktop ? 60 : isTablet ? 40 : 24;
  const link = (url: string) => { if (url) window.open(url, "_blank", "noopener"); };
  const social = (icon: string, url: string) => (
    <Tap onClick={() => link(url)} style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={20} color={C.secondary} />
    </Tap>
  );
  const brand = (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/logo3.png" alt="" width={isDesktop ? 70 : 60} height={isDesktop ? 70 : 60} style={{ objectFit: "contain" }} />
      <div style={{ height: 16 }} />
      <div style={{ color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 1.7, fontWeight: 400 }}>{t("brandDescription")}</div>
      <div style={{ height: 24 }} />
      <div style={{ display: "flex", gap: 12 }}>
        {social("facebook_rounded", "https://www.facebook.com/SaborlyBurger/")}
        {social("camera_alt_rounded", "https://www.instagram.com/saborly.es/?igsh=eDg0a2FvZ2Zqbmg%3D&utm_source=qr#")}
        {social("email_rounded", "mailto:info@saborly.es")}
      </div>
    </div>
  );
  const section = (title: string, links: [string, string][]) => (
    <div>
      <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{title}</div>
      <div style={{ height: 20 }} />
      {links.map(([label, dest]) => (
        <div key={label} style={{ paddingBottom: 12 }}>
          <Tap onClick={() => { if (/^(http|mailto|tel)/.test(dest)) link(dest); else router.push(dest); }} style={{ display: "inline-block", color: "rgba(255,255,255,.6)", fontSize: 14, fontWeight: 400 }}>{label}</Tap>
        </div>
      ))}
    </div>
  );
  const quick = section(t("quickLinks"), [[t("aboutUs"), ROUTES.about], [t("ourMenu"), ROUTES.menu], [t("profile"), ROUTES.profile], [t("cart"), ROUTES.cart]]);
  const resources = section(t("resources"), [[t("contactUs"), "mailto:info@saborly.es"], [t("helpAndSupport"), ROUTES.contact], [t("privacyPolicy"), ROUTES.privacy], [t("faq"), ROUTES.faq]]);
  const contactItem = (icon: string, text: string, url: string) => (
    <div onClick={url ? () => link(url) : undefined} style={{ display: "flex", alignItems: "center", cursor: url ? "pointer" : "default" }}>
      <Icon name={icon} size={18} color={C.primary} /><span style={{ width: 12 }} />
      <span style={{ flex: 1, color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 400 }}>{text}</span>
    </div>
  );
  const contact = (
    <div>
      <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{t("stayConnected")}</div>
      <div style={{ height: 12 }} />
      <div style={{ color: "rgba(255,255,255,.6)", fontSize: 13 }}>{t("subscribeOffers")}</div>
      <div style={{ height: 16 }} />
      <div style={{ display: "flex", background: "rgba(255,255,255,.07)", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)" }}>
        <input placeholder={t("yourEmail")} style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: 0, color: "#fff", fontSize: 14, padding: "12px 16px" }} />
        <div style={{ margin: 4, borderRadius: 10, background: G.primary }}>
          <Tap onClick={() => {}} style={{ padding: "12px 20px", display: "flex" }}><Icon name="arrow_forward" size={18} color="#fff" /></Tap>
        </div>
      </div>
      <div style={{ height: 24 }} />
      {contactItem("email_outlined", t("infoEmail"), `mailto:${t("infoEmail")}`)}
      <div style={{ height: 12 }} />
      {contactItem("phone_outlined", t("34 932112072"), `tel:${t("34 932112072")}`)}
      <div style={{ height: 12 }} />
      {contactItem("location_on_outlined", t("address"), "")}
    </div>
  );
  const copyright = <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>© {new Date().getFullYear()} {t("copyright").replace("© 2025", "").trim()}</div>;
  const payments = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>{t("weAccept")}</span><span style={{ width: 12 }} />
      {[t("visa"), t("mastercard"), t("paypal")].map((m) => (
        <span key={m} style={{ marginLeft: 8, padding: "6px 12px", background: "rgba(255,255,255,.05)", borderRadius: 4, border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: 11, fontWeight: 600 }}>{m}</span>
      ))}
    </div>
  );
  return (
    <div style={{ width: "100%", background: "linear-gradient(135deg, #2A1611, #4A2015)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: `${padV}px ${padH}px`, boxSizing: "border-box" }}>
        {isDesktop ? (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ flex: 2 }}>{brand}</div><span style={{ width: 60 }} /><div style={{ flex: 1 }}>{quick}</div><span style={{ width: 40 }} /><div style={{ flex: 1 }}>{resources}</div><span style={{ width: 60 }} /><div style={{ flex: 2 }}>{contact}</div>
          </div>
        ) : isTablet ? (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 2 }}>{brand}</div><span style={{ width: 40 }} /><div style={{ flex: 1 }}>{quick}</div><span style={{ width: 40 }} /><div style={{ flex: 1 }}>{resources}</div>
            </div>
            <div style={{ height: 40 }} />{contact}
          </div>
        ) : (
          <div>{brand}<div style={{ height: 32 }} />{quick}<div style={{ height: 28 }} />{resources}<div style={{ height: 32 }} />{contact}</div>
        )}
      </div>
      <div style={{ background: "rgba(0,0,0,.3)", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: `20px ${padH}px`, boxSizing: "border-box", ...(isDesktop ? { display: "flex", justifyContent: "space-between", alignItems: "center" } : { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }) }}>
          {copyright}{payments}
        </div>
      </div>
    </div>
  );
}

// ---------------- Download app modal ----------------
const AUTO_CLOSE = 20;
export function DownloadAppModal({ onClose }: { onClose: () => void }) {
  const { width, height } = useScreen();
  const [left, setLeft] = useState(AUTO_CLOSE);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const compact = width < 420 || height < 720;
  useEffect(() => { requestAnimationFrame(() => setShown(true)); }, []);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const close = () => { setClosing(true); setTimeout(onClose, 250); };
  useEffect(() => { if (left <= 0) close(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (url: string) => window.open(url, "_blank", "noopener");
  const poppins = "var(--font-poppins), sans-serif";
  const logo = compact ? 72 : 100;
  const store = (icon: string, tag: string, name: string, url: string) => <StoreButton icon={icon} tagline={tag} name={name} onTap={() => open(url)} />;
  const IOS = "https://apps.apple.com/pk/app/saborly/id6761368370", AND = "https://play.google.com/store/apps/details?id=com.saborly.soely";
  const stacked = Math.min(460, width - 32) - (compact ? 40 : 64) < 360;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9400, background: "rgba(0,0,0,.54)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", boxSizing: "border-box", opacity: shown && !closing ? 1 : 0, transition: "opacity 300ms ease-in" }}>
      <div style={{ width: "100%", maxWidth: 460, maxHeight: "100%", overflow: "auto", position: "relative", background: "#fff", borderRadius: compact ? 20 : 24, boxShadow: "0 20px 40px rgba(0,0,0,.2)",
        transform: shown && !closing ? "scale(1)" : "scale(.6)", transition: "transform 400ms cubic-bezier(.175,.885,.32,1.275)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: `${compact ? 20 : 34}px 0`, background: `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.8)})` }}>
          <div style={{ width: logo, height: logo, boxSizing: "border-box", padding: 6, background: "#fff", borderRadius: compact ? 20 : 24, boxShadow: "0 10px 20px rgba(0,0,0,.12)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/images/logo3.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40 }}>
          <Tap ariaLabel="Close" onClick={close} style={{ width: 40, height: 40, position: "relative" }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <circle cx="20" cy="20" r="18.75" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" />
              <circle cx="20" cy="20" r="18.75" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 18.75} strokeDashoffset={2 * Math.PI * 18.75 * (1 - Math.max(left, 0) / AUTO_CLOSE)} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", left: 4.5, top: 4.5, width: 31, height: 31, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Icon name="close" size={13} color="#fff" /><span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>{Math.max(left, 0)}</span>
            </div>
          </Tap>
        </div>
        <div style={{ padding: compact ? "20px" : "28px 32px 30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", padding: `${compact ? 8 : 10}px ${compact ? 16 : 20}px`, borderRadius: 50, background: "linear-gradient(90deg, #FF6B6B, #FF8E53)", boxShadow: "0 4px 12px rgba(255,107,107,.3)" }}>
            <Icon name="local_offer" size={compact ? 16 : 18} color="#fff" /><span style={{ width: 8 }} />
            <span style={{ fontFamily: poppins, fontSize: compact ? 14 : 16, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>Get 20% OFF</span>
          </div>
          <div style={{ height: compact ? 16 : 20 }} />
          <div style={{ textAlign: "center", fontFamily: poppins, fontSize: compact ? 23 : 28, fontWeight: 800, color: C.textDark, lineHeight: 1.2 }}>Download our app</div>
          <div style={{ height: compact ? 8 : 12 }} />
          <div style={{ textAlign: "center", fontFamily: poppins, fontSize: compact ? 13.5 : 15, color: C.textMedium, lineHeight: 1.5 }}>Order from our mobile app and save on your first order!</div>
          <div style={{ height: compact ? 20 : 28 }} />
          <div style={{ width: "100%", display: "flex", flexDirection: stacked ? "column" : "row", gap: stacked ? 10 : 14 }}>
            <div style={{ flex: 1 }}>{store("apple", "Download on the", "App Store", IOS)}</div>
            <div style={{ flex: 1 }}>{store("play_arrow_rounded", "Get it on", "Google Play", AND)}</div>
          </div>
          <div style={{ height: compact ? 20 : 24 }} />
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {([["delivery_dining", "Fast Delivery"], ["percent", "Exclusive Deals"], ["notifications_active", "Order Tracking"]] as const).map(([ic, tx]) => (
              <div key={tx} style={{ display: "flex", alignItems: "center", padding: "7px 12px", background: withOpacity(C.primary, 0.07), borderRadius: 50 }}>
                <Icon name={ic} size={16} color={C.primary} /><span style={{ width: 6 }} />
                <span style={{ fontFamily: poppins, fontSize: 12.5, fontWeight: 500, color: C.textMedium }}>{tx}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function StoreButton({ icon, tagline, name, onTap }: { icon: string; tagline: string; name: string; onTap: () => void }) {
  const [hover, setHover] = useState(false);
  const poppins = "var(--font-poppins), sans-serif";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Tap onClick={onTap} style={{ minHeight: 54, boxSizing: "border-box", padding: "10px 14px", borderRadius: 12, background: hover ? C.textDark : "#000", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 200ms", boxShadow: hover ? "0 6px 12px rgba(0,0,0,.3)" : "none" }}>
        <Icon name={icon === "apple" ? "apple" : icon} size={26} color="#fff" /><span style={{ width: 10 }} />
        <div>
          <div style={{ fontFamily: poppins, fontSize: 10, color: "rgba(255,255,255,.8)", lineHeight: 1.2 }}>{tagline}</div>
          <div style={{ fontFamily: poppins, fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.25, whiteSpace: "nowrap" }}>{name}</div>
        </div>
      </Tap>
    </div>
  );
}
void fmt2;
