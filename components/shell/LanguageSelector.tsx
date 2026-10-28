"use client";
import { useState } from "react";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Dialog, Spinner, Tap, usePopup } from "@/components/ui/primitives";
import { showSnack, hideSnack } from "@/components/ui/Toast";
import { SUPPORTED_LANGUAGES, LanguageOption, localizedLanguageName } from "@/lib/i18n";
import { useScreen } from "@/lib/screenutil";
import { changeLanguage, useLanguage } from "@/lib/stores/language";
import { loadHomeData, loadCategories, loadFoodItems } from "@/lib/stores/catalog";

const TITLE: Record<string, string> = { en: "Select Language", es: "Seleccionar Idioma", ca: "Seleccionar Idioma", ar: "اختر اللغة", fr: "Choisir la Langue" };
const LOADING: Record<string, string> = { en: "Changing language...", es: "Cambiando idioma...", ca: "Canviant idioma...", ar: "تغيير اللغة...", fr: "Changement de langue..." };
const SUCCESS: Record<string, (n: string) => string> = {
  en: (n) => `Language changed to ${n}`, es: (n) => `Idioma cambiado a ${n}`, ca: (n) => `Idioma canviat a ${n}`,
  ar: (n) => `تم تغيير اللغة إلى ${n}`, fr: (n) => `Langue changée en ${n}`,
};

async function doChange(current: string, code: string, sp: (n: number) => number, w: (n: number) => number, h: (n: number) => number) {
  const selected = SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
  showSnack(
    <span style={{ display: "flex", alignItems: "center" }}>
      <span style={{ width: w(16), height: h(16), display: "inline-flex" }}><Spinner size={Math.min(w(16), h(16))} stroke={2} color="#fff" /></span>
      <span style={{ width: w(12) }} />{LOADING[current] ?? LOADING.en}
    </span>, { durationMs: 1000 });
  try {
    changeLanguage(code);
    await Promise.all([loadHomeData(), loadCategories(), loadFoodItems()]);
    hideSnack();
    // _getSuccessMessage reads languageService.currentLanguage *after* the change => the new language
    showSnack((SUCCESS[code] ?? SUCCESS.en)(selected.nativeName), { durationMs: 2000, bg: "#4CAF50" });
  } catch (e) {
    hideSnack();
    showSnack(`Failed to change language: ${String(e)}`, { durationMs: 3000, bg: "#F44336" });
  }
  void sp;
}

function Flag({ lang }: { lang: LanguageOption }) {
  const { w, sp } = useScreen();
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: sp(20) }}>{lang.flag}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={lang.flagAsset} alt="" width={w(20)} height={w(20)} onError={() => setFailed(true)} style={{ width: w(20), height: w(20), objectFit: "fill" }} />;
}

export function LanguageSelector({ isCompact = false }: { showLabel?: boolean; isCompact?: boolean }) {
  const { language, option } = useLanguage();
  const { sp, w, h, r } = useScreen();
  const pop = usePopup();
  const [dialog, setDialog] = useState(false);

  if (isCompact) {
    const itemH = 48;
    return (
      <div ref={pop.ref} style={{ position: "relative", flex: "none", fontFamily: "var(--font-manrope), sans-serif" }}>
        <Tap onClick={() => pop.setOpen(!pop.open)} style={{
          height: h(40), padding: `0 ${w(8)}px`, boxSizing: "border-box", background: "#FAFAFA", borderRadius: r(20),
          border: "1px solid #EEEEEE", display: "flex", alignItems: "center",
        }}>
          <Flag lang={option} /><span style={{ width: w(8) }} />
          <span style={{ fontSize: sp(14), color: C.textDark }}>{option.code.toUpperCase()}</span>
          <Icon name="arrow_drop_down" size={sp(18)} color={C.textLight} />
        </Tap>
        {pop.open && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: 120, whiteSpace: "nowrap", background: "#fff", borderRadius: 8,
            padding: "8px 0", zIndex: 50, boxShadow: "0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)",
          }}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <Tap key={l.code} onClick={() => { pop.setOpen(false); void doChange(language, l.code, sp, w, h); }}
                style={{ height: itemH, padding: "0 16px", display: "flex", alignItems: "center", background: l.code === language ? "rgba(0,0,0,.04)" : undefined }}>
                <Flag lang={l} /><span style={{ width: w(8) }} />
                <span style={{ fontSize: sp(14), color: C.textDark }}>{l.code.toUpperCase()}</span>
              </Tap>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Tap onClick={() => setDialog(true)} style={{
        padding: `${h(8)}px ${w(12)}px`, background: "#FAFAFA", borderRadius: r(20), border: "1px solid #EEEEEE", display: "inline-flex", alignItems: "center",
      }}>
        <span style={{ fontSize: sp(20) }}>{option.flag}</span><span style={{ width: w(8) }} />
        <span style={{ fontSize: sp(14), fontWeight: 500, color: C.textDark }}>{option.nativeName}</span><span style={{ width: w(4) }} />
        <Icon name="arrow_drop_down" size={sp(20)} color={C.textLight} />
      </Tap>
      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <div style={{ background: "#fff", borderRadius: r(20), width: "100%", maxWidth: w(400), padding: w(20), boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: sp(20), fontWeight: 700, color: C.textDark }}>{TITLE[language] ?? TITLE.en}</span>
            <Tap onClick={() => setDialog(false)} style={{ display: "flex" }}><Icon name="close" size={sp(24)} /></Tap>
          </div>
          <div style={{ height: h(20) }} />
          {SUPPORTED_LANGUAGES.map((l) => {
            const sel = l.code === language;
            return (
              <Tap key={l.code} onClick={() => { void doChange(language, l.code, sp, w, h); setDialog(false); }} style={{
                padding: `${h(12)}px ${w(16)}px`, marginBottom: h(8), borderRadius: r(12), display: "flex", alignItems: "center",
                background: sel ? withOpacity(C.primary, 0.1) : "transparent", border: `${sel ? 2 : 1}px solid ${sel ? C.primary : "#EEEEEE"}`,
              }}>
                <span style={{ fontSize: sp(28) }}>{l.flag}</span><span style={{ width: w(16) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: sp(16), fontWeight: 600, color: sel ? C.primary : C.textDark }}>{l.nativeName}</div>
                  <div style={{ fontSize: sp(13), color: C.textLight }}>{localizedLanguageName(language, l.code)}</div>
                </div>
                {sel && <Icon name="check_circle" size={sp(24)} color={C.primary} />}
              </Tap>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
