"use client";
import { useEffect, useRef, useState } from "react";
import { C, G, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner, Tap, clamp } from "@/components/ui/primitives";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { loadHomeData, performSearch } from "@/lib/stores/catalog";

/** Port of SearchBarWidget (lib/shared/widgets/search_bar_widget.dart). */
export function SearchBar({ value, onValueChange, onSearch, hintText, enabled = true, onSearchStarted, autoFocus }: {
  value?: string; onValueChange?: (v: string) => void; onSearch?: (q: string) => void; hintText?: string; enabled?: boolean;
  onSearchStarted?: () => void; autoFocus?: boolean;
}) {
  const { sp, h, w, r } = useScreen();
  const { t, dir } = useLanguage();
  const [inner, setInner] = useState("");
  const text = value ?? inner;
  const [focused, setFocused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [cw, setCw] = useState(1000);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  const small = cw < 600, tablet = cw >= 600 && cw < 900;
  const height = small ? clamp(h(50), 48, 54) : tablet ? clamp(h(56), 52, 60) : clamp(h(62), 58, 66);
  const hpad = small ? clamp(w(12), 10, 14) : tablet ? clamp(w(16), 14, 18) : clamp(w(20), 18, 22);
  const fs = small ? clamp(sp(15), 14, 16) : tablet ? clamp(sp(16), 15, 17) : clamp(sp(17), 16, 18);
  const iconSize = small ? clamp(sp(20), 18, 22) : tablet ? clamp(sp(22), 20, 24) : clamp(sp(24), 22, 26);
  const radius = small ? clamp(r(14), 12, 16) : tablet ? clamp(r(16), 14, 18) : clamp(r(18), 16, 20);

  const set = (v: string) => { if (value === undefined) setInner(v); onValueChange?.(v); };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (v: string) => {
    set(v);
    onSearch?.(v);
    if (v === "") void loadHomeData();
    else {
      onSearchStarted?.();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (input.current && input.current.value === v) {
          void performSearch(v);
          setTimeout(() => onSearchStarted?.(), 500);
        }
      }, 300);
    }
  };
  const submit = () => {
    onSearch?.(text);
    if (text) { void performSearch(text); setTimeout(() => onSearchStarted?.(), 300); }
    input.current?.blur();
  };
  const clear = () => {
    set("");
    if (onSearch) onSearch(""); else void loadHomeData();
    input.current?.blur();
  };

  return (
    <div ref={wrap} style={{ width: "100%", fontFamily: "var(--font-manrope), sans-serif" }}>
      <div style={{
        height, display: "flex", alignItems: "center", boxSizing: "border-box", direction: dir,
        transform: focused ? "scale(1.02)" : "scale(1)", transition: "transform 300ms ease-in-out, box-shadow 300ms ease-in-out",
        background: G.surface, borderRadius: radius, border: `${focused ? 2 : 1}px solid ${focused ? C.primary : C.border}`,
        boxShadow: focused ? `0 ${h(8)}px ${r(20)}px 1px ${withOpacity(C.primary, 0.15)}` : `0 ${h(5)}px ${r(14)}px ${withOpacity("#1A0803", 0.35)}`,
      }}>
        <span style={{ width: hpad, flex: "none" }} />
        <div style={{
          padding: w(8), borderRadius: r(12), transition: "background 300ms", display: "flex",
          background: focused ? withOpacity(C.primary, 0.14) : C.accentCream, flex: "none",
        }}>
          <Icon name="search_rounded" size={iconSize} color={focused ? C.primary : "#757575"} />
        </div>
        <span style={{ width: w(12), flex: "none" }} />
        <input ref={input} value={text} disabled={!enabled} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={hintText ?? t("search")} dir={dir}
          style={{
            flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", padding: 0, fontSize: fs, color: C.textDark,
            fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.2, fontFamily: "var(--font-manrope), sans-serif",
          }} />
        {text.length > 0 && (
          <Tap onClick={clear} style={{ padding: w(6), borderRadius: "50%", background: C.accentCream, display: "flex", flex: "none" }}>
            <Icon name="close_rounded" size={iconSize - 4} color="#757575" />
          </Tap>
        )}
        <span style={{ width: hpad, flex: "none" }} />
      </div>
      <style>{`input::placeholder{color:#BDBDBD;font-weight:400;letter-spacing:.2px}`}</style>
    </div>
  );
}

/** SearchFeedbackBanner */
export function SearchFeedbackBanner({ query, resultCount, isLoading, onClear }: {
  query: string; resultCount: number; isLoading: boolean; onClear: () => void;
}) {
  const { sp, w, h, r } = useScreen();
  const { t, dir } = useLanguage();
  return (
    <div style={{
      marginBottom: h(16), padding: w(16), display: "flex", alignItems: "center", direction: dir, boxSizing: "border-box",
      background: `linear-gradient(135deg, ${withOpacity(C.secondaryLight, 0.45)}, ${withOpacity(C.primaryLight, 0.25)})`,
      borderRadius: r(16), border: `1.5px solid ${withOpacity(C.primary, 0.2)}`, boxShadow: `0 ${h(4)}px ${r(16)}px ${withOpacity(C.primary, 0.1)}`,
      animation: "popin 400ms cubic-bezier(.175,.885,.32,1.275)",
    }}>
      <div style={{ padding: w(12), borderRadius: r(12), background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.12)}, ${withOpacity(C.secondary, 0.12)})`, display: "flex" }}>
        <Icon name="search_rounded" size={sp(24)} color={C.primary} />
      </div>
      <span style={{ width: w(16) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: sp(13), fontWeight: 500, color: C.textMedium }}>{t("resultsFor")}</span>
          <span style={{ fontSize: sp(15), fontWeight: 700, color: C.textDark, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&quot;{query}&quot;</span>
        </div>
        <div style={{ height: h(6) }} />
        <div style={{ display: "inline-flex", alignItems: "center", padding: `${h(4)}px ${w(10)}px`, background: withOpacity(C.primary, 0.15), borderRadius: r(8) }}>
          {isLoading ? <Spinner size={sp(12)} stroke={2} /> : <Icon name="check_circle_rounded" size={sp(14)} color={C.primary} />}
          <span style={{ width: w(6) }} />
          <span style={{ fontSize: sp(12), fontWeight: 700, color: C.primary, letterSpacing: 0.3 }}>
            {isLoading ? t("searching") : `${resultCount} ${t(resultCount === 1 ? "item" : "items")} ${t("found")}`}
          </span>
        </div>
      </div>
      <span style={{ width: w(12) }} />
      <Tap onClick={onClear} style={{ padding: w(10), borderRadius: r(10), background: "#fff", boxShadow: `0 ${h(2)}px ${r(4)}px rgba(0,0,0,.05)`, display: "flex" }}>
        <Icon name="close_rounded" size={sp(20)} color={C.textDark} />
      </Tap>
    </div>
  );
}
