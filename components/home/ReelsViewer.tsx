"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap } from "@/components/ui/primitives";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { useStore } from "@/lib/store";
import { ROUTES } from "@/lib/nav";
import { SaborlyVideo, closeReels, formatVideoDuration, posterAsset, reelsStore, videoAsset } from "@/lib/videos";
import { SaborlyBadge } from "./media";

// Port of VideoReelsViewer. Session-scoped mute memory; web starts muted (browser autoplay rules).
let sessionMuted = true;
const WIDE_BREAKPOINT = 700;

export function ReelsViewerHost() {
  const s = useStore(reelsStore);
  if (!s.open) return null;
  return <ReelsViewer videos={s.videos} initialIndex={s.index} />;
}

function Glass({ icon, tooltip, onTap, size = 42 }: { icon: string; tooltip: string; onTap?: () => void; size?: number }) {
  return (
    <div title={tooltip} style={{ opacity: onTap ? 1 : 0.35, transition: "opacity 150ms" }}>
      <Tap onClick={onTap} disabled={!onTap} ariaLabel={tooltip} style={{
        width: size, height: size, boxSizing: "border-box", borderRadius: "50%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.18)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.52} color="#fff" />
      </Tap>
    </div>
  );
}

function ReelsViewer({ videos, initialIndex }: { videos: SaborlyVideo[]; initialIndex: number }) {
  const u = useScreen();
  const { t } = useLanguage();
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), videos.length - 1));
  const [muted, setMutedState] = useState(sessionMuted);
  const [showHint, setShowHint] = useState(sessionMuted);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState({ pos: 0, dur: 0 });
  const vids = useRef<Record<number, HTMLVideoElement | null>>({});
  const wheelCool = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wide = u.width >= WIDE_BREAKPOINT;

  const goTo = useCallback((i: number) => { if (i >= 0 && i < videos.length) setIndex(i); }, [videos.length]);
  const setMuted = (m: boolean) => { sessionMuted = m; setMutedState(m); setShowHint(false); };

  // Only current video + neighbours are mounted (decoder budget); current plays, others pause at 0
  useEffect(() => {
    Object.entries(vids.current).forEach(([k, el]) => {
      if (!el) return;
      if (Number(k) === index) { el.muted = muted; void el.play().catch(() => { /* autoplay with sound rejected */
        if (!muted) { sessionMuted = true; setMutedState(true); setShowHint(true); el.muted = true; void el.play().catch(() => {}); } }); }
      else { el.pause(); try { el.currentTime = 0; } catch { /* not ready */ } }
    });
    setTime({ pos: 0, dur: 0 });
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { Object.values(vids.current).forEach((el) => { if (el) el.muted = muted; }); }, [muted]);

  const toggle = () => { const el = vids.current[index]; if (!el) return; if (el.paused) void el.play(); else el.pause(); };
  const close = () => closeReels();
  const orderNow = () => { closeReels(); router.push(ROUTES.menu); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === " " || e.key.toLowerCase() === "k") { e.preventDefault(); toggle(); }
      else if (e.key.toLowerCase() === "m") setMuted(!muted);
      else return;
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const onWheel = (e: React.WheelEvent) => {
    if (!wide || Math.abs(e.deltaY) < 8) return;
    const idle = wheelCool.current == null;
    if (wheelCool.current) clearTimeout(wheelCool.current);
    wheelCool.current = setTimeout(() => (wheelCool.current = null), 260);
    if (idle) goTo(index + (e.deltaY > 0 ? 1 : -1));
  };
  const dragY = useRef<number | null>(null);
  const dragProps = {
    onPointerDown: (e: React.PointerEvent) => { dragY.current = e.clientY; },
    onPointerUp: (e: React.PointerEvent) => {
      if (dragY.current == null) return;
      const dy = e.clientY - dragY.current; dragY.current = null;
      if (dy < -40) goTo(index + 1); else if (dy > 40) goTo(index - 1);
    },
  };

  const keep = new Set([index - 1, index, index + 1].filter((i) => i >= 0 && i < videos.length));

  const pages = (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none" }} {...dragProps}>
      <div style={{ height: `${videos.length * 100}%`, transform: `translateY(${-index * (100 / videos.length)}%)`, transition: "transform 380ms cubic-bezier(.215,.61,.355,1)" }}>
        {videos.map((v, i) => (
          <div key={v.id} style={{ height: `${100 / videos.length}%`, position: "relative", overflow: "hidden" }} onClick={() => i === index && toggle()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterAsset(v)} alt="" style={{ position: "absolute", inset: -40, width: "calc(100% + 80px)", height: "calc(100% + 80px)", objectFit: "cover", filter: "blur(24px)" }} />
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {!ready.has(i) && <img src={posterAsset(v)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              {keep.has(i) && !failed.has(i) && (
                <video ref={(el) => { vids.current[i] = el; }} src={videoAsset(v)} playsInline preload="auto" muted={muted}
                  onLoadedData={() => setReady((s) => new Set(s).add(i))} onError={() => setFailed((s) => new Set(s).add(i))}
                  onPlay={() => i === index && setPlaying(true)} onPause={() => i === index && setPlaying(false)}
                  onTimeUpdate={(e) => { if (i === index) setTime({ pos: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 }); }}
                  onEnded={() => { if (i === index && i < videos.length - 1) goTo(i + 1); }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: ready.has(i) ? 1 : 0, transition: "opacity 250ms" }} />
              )}
              {!ready.has(i) && keep.has(i) && !failed.has(i) && <div style={{ position: "absolute" }}><Spinner size={36} stroke={3} color={C.secondary} /></div>}
              {failed.has(i) && (
                <div style={{ position: "absolute", margin: "0 28px", padding: "18px 20px 10px", background: "rgba(0,0,0,.72)", borderRadius: 18, textAlign: "center", color: "#fff" }}>
                  <Icon name="error_outline_rounded" size={30} color="#fff" />
                  <div style={{ height: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t("videoLoadError")}</div>
                  <Tap onClick={() => setFailed((s) => { const n = new Set(s); n.delete(i); return n; })} style={{ padding: "8px 16px", color: C.secondary, fontWeight: 800 }}>{t("retry")}</Tap>
                </div>
              )}
              {i === index && ready.has(i) && !playing && (
                <div style={{ position: "absolute", width: 76, height: 76, borderRadius: "50%", background: "rgba(0,0,0,.45)", border: "1.5px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <Icon name={time.dur > 0 && time.pos >= time.dur ? "replay_rounded" : "play_arrow_rounded"} size={44} color="#fff" />
                </div>
              )}
            </div>
            <Info video={v} compact={!wide} active={i === index} time={time} onOrderNow={orderNow} onSeek={(sec) => { const el = vids.current[index]; if (el) el.currentTime = sec; }} />
          </div>
        ))}
      </div>
    </div>
  );

  const counter = <div dir="ltr" style={{ padding: "7px 12px", background: "rgba(0,0,0,.4)", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", fontSize: 12.5, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{index + 1} / {videos.length}</div>;
  const muteBtn = <Glass icon={muted ? "volume_off_rounded" : "volume_up_rounded"} tooltip={t(muted ? "videoUnmute" : "videoMute")} onTap={() => setMuted(!muted)} />;
  const hint = (top: number) => showHint && muted && (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 3 }}>
      <Tap onClick={() => setMuted(false)} style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "#fff", borderRadius: 999, boxShadow: "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px rgba(0,0,0,.14)" }}>
        <Icon name="volume_up_rounded" size={18} color={C.primary} /><span style={{ width: 8 }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: C.textDark }}>{t("videoTapForSound")}</span>
      </Tap>
    </div>
  );

  if (!wide) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "#000" }}>
        {pages}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 8px 0", display: "flex", alignItems: "center", zIndex: 3 }}>
          <Glass icon="close_rounded" tooltip={t("close")} onTap={close} />
          <span style={{ flex: 1 }} />{counter}<span style={{ width: 8 }} />{muteBtn}
        </div>
        {hint(64)}
      </div>
    );
  }

  const gutter = 24, navWidth = 48, upNextWidth = 290;
  const frameH = Math.min(Math.max(u.height - 56, 360), 900), frameW = (frameH * 9) / 16;
  const showUpNext = u.width >= frameW + 2 * (gutter * 2 + navWidth + upNextWidth) + 48;
  const sideWidth = gutter + navWidth + (showUpNext ? gutter + upNextWidth : 0);
  const upcoming = [1, 2, 3].filter((s) => s < videos.length).map((s) => (index + s) % videos.length);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9500 }} onWheel={onWheel}>
      <div style={{ position: "absolute", inset: 0, background: withOpacity(C.accentNight, 0.94) }} onClick={close} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", pointerEvents: "auto" }}>
          <span style={{ width: sideWidth }} />
          <div style={{ width: frameW, height: frameH, position: "relative", borderRadius: 26, boxShadow: "0 24px 60px rgba(0,0,0,.5)", overflow: "hidden" }}>
            {pages}
            <div style={{ position: "absolute", top: 14, insetInlineEnd: 14, display: "flex", alignItems: "center", zIndex: 3 }}>{counter}<span style={{ width: 8 }} />{muteBtn}</div>
            {hint(68)}
          </div>
          <span style={{ width: gutter }} />
          <div style={{ width: navWidth, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Glass icon="keyboard_arrow_up_rounded" tooltip={t("videoPrevious")} size={48} onTap={index > 0 ? () => goTo(index - 1) : undefined} />
            <Glass icon="keyboard_arrow_down_rounded" tooltip={t("videoNext")} size={48} onTap={index < videos.length - 1 ? () => goTo(index + 1) : undefined} />
          </div>
          {showUpNext && (<>
            <span style={{ width: gutter }} />
            <div style={{ width: upNextWidth, boxSizing: "border-box", padding: "18px 16px 10px", background: "rgba(255,255,255,.06)", borderRadius: 22, border: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ padding: "0 6px", fontSize: 11.5, fontWeight: 800, color: C.secondary, letterSpacing: 1.4 }}>{t("videoUpNext").toUpperCase()}</div>
              <div style={{ height: 10 }} />
              {upcoming.map((i) => (
                <Tap key={i} onClick={() => goTo(i)} style={{ padding: 6, borderRadius: 14, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "relative", width: 58, height: 103, borderRadius: 10, overflow: "hidden", flex: "none" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={posterAsset(videos[i])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{ position: "absolute", right: 4, bottom: 4, padding: "2px 5px", background: "rgba(0,0,0,.6)", borderRadius: 6, fontSize: 9.5, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{formatVideoDuration(videos[i].durationSec)}</span>
                  </div>
                  <span style={{ width: 12 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: C.primaryLight, letterSpacing: 1 }}>{t(videos[i].tag).toUpperCase()}</div>
                    <div style={{ height: 4 }} />
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t(videos[i].titleKey)}</div>
                  </div>
                </Tap>
              ))}
            </div>
          </>)}
        </div>
      </div>
      <div style={{ position: "absolute", top: 20, insetInlineEnd: 20 }}><Glass icon="close_rounded" tooltip={t("close")} size={48} onTap={close} /></div>
    </div>
  );
}

function Info({ video, compact, active, time, onOrderNow, onSeek }: { video: SaborlyVideo; compact: boolean; active: boolean; time: { pos: number; dur: number }; onOrderNow: () => void; onSeek: (s: number) => void }) {
  const { t } = useLanguage();
  const pos = active ? Math.min(time.pos, time.dur || time.pos) : 0;
  const dur = active && time.dur ? time.dur : video.durationSec;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `48px 18px calc(14px + ${compact ? "env(safe-area-inset-bottom)" : "0px"})`, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.7) 45%, rgba(18,9,6,.9) 100%)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <SaborlyBadge size={32} showName nameSize={15} /><span style={{ width: 10 }} />
        <span style={{ padding: "4px 10px", borderRadius: 999, background: "linear-gradient(135deg, #E46221, #B33E17)", fontSize: 10.5, fontWeight: 800, color: "#fff", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(video.tag).toUpperCase()}</span>
      </div>
      <div style={{ height: 12 }} />
      <div style={{ fontFamily: "var(--font-bree), serif", fontSize: compact ? 22 : 24, color: "#fff", lineHeight: 1.2, letterSpacing: -0.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t(video.titleKey)}</div>
      <div style={{ height: 14 }} />
      <Tap onClick={onOrderNow} style={{ display: "inline-flex", alignItems: "center", padding: "11px 18px", borderRadius: 999, background: "linear-gradient(135deg, #E46221, #B33E17)", boxShadow: `0 6px 18px ${withOpacity(C.primary, 0.45)}` }}>
        <Icon name="restaurant_menu_rounded" size={18} color="#fff" /><span style={{ width: 8 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{t("videoOrderNow")}</span>
      </Tap>
      <div style={{ height: 16 }} />
      {active && (
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, padding: "6px 0", cursor: "pointer" }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * (time.dur || 0)); }}>
            <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.14)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${dur ? (pos / dur) * 100 : 0}%`, background: C.primary }} />
            </div>
          </div>
          <span style={{ width: 12 }} />
          <span dir="ltr" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)", fontVariantNumeric: "tabular-nums" }}>{formatVideoDuration(pos)} / {formatVideoDuration(dur)}</span>
        </div>
      )}
    </div>
  );
}
