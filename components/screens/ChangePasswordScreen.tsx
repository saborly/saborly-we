"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { useScreen } from "@/lib/screenutil";
import { authStore, changePassword, useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

const BLUE = "#2196F3";

function Field({ label, hint, value, onChange, error }: { label: string; hint: string; value: string; onChange: (v: string) => void; error?: string | null }) {
  const u = useScreen();
  const [obscure, setObscure] = useState(true);
  const [focused, setFocused] = useState(false);
  const border = error ? `1px solid ${C.error}` : focused ? `2px solid ${C.primary}` : `1px solid ${withOpacity(C.border, 0.3)}`;
  return (
    <div>
      <div style={{ fontSize: u.sp(14), fontWeight: 500, color: C.textDark }}>{label}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ display: "flex", alignItems: "center", background: C.background, borderRadius: u.r(12), border, boxSizing: "border-box" }}>
        <input className="cp-input" value={value} type={obscure ? "password" : "text"} placeholder={hint} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: u.sp(16), color: C.textDark, padding: `${u.h(14)}px ${u.w(16)}px` }} />
        <button aria-label="toggle" onClick={() => setObscure(!obscure)} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={obscure ? "visibility_off_outlined" : "visibility_outlined"} size={u.sp(20)} color={C.textLight} />
        </button>
      </div>
      {error && <div style={{ fontSize: u.sp(12), color: C.error, marginTop: 8, padding: "0 16px", lineHeight: 1.33 }}>{error}</div>}
    </div>
  );
}

// Port of lib/features/auth/screens/changeword.dart
export function ChangePasswordScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [cur, setCur] = useState(""), [next, setNext] = useState(""), [conf, setConf] = useState("");
  const [errs, setErrs] = useState<Record<string, string | null>>({});
  const isWeb = u.width > 600;

  const submit = async () => {
    const e: Record<string, string | null> = {};
    if (!cur) e.cur = t("pleaseEnterCurrentPassword");
    if (!next) e.next = t("pleaseEnterNewPassword");
    else if (next.length < 6) e.next = t("passwordMinLength6");
    else if (next === cur) e.next = t("newPasswordDifferent");
    if (!conf) e.conf = t("pleaseConfirmNewPassword");
    else if (conf !== next) e.conf = t("passwordsDontMatch");
    setErrs(e);
    if (Object.values(e).some(Boolean)) return;
    const ok = await changePassword({ currentPassword: cur, newPassword: next, confirmPassword: conf });
    if (ok) {
      showSnack(t("passwordChangedSuccess"), { bg: C.success, radius: `${u.r(12)}px` });
      router.back();
    } else showSnack(authStore.state.error ?? t("passwordChangeFailed"), { bg: C.error, radius: `${u.r(12)}px` });
  };
  const tip = (text: string) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ width: u.w(6), height: u.h(6), background: BLUE, borderRadius: "50%", flex: "none" }} />
      <span style={{ width: u.w(12) }} />
      <span style={{ flex: 1, fontSize: u.sp(13), color: withOpacity(C.textDark, 0.8), lineHeight: 1.4 }}>{text}</span>
    </div>
  );

  return (
    <div style={{ flex: 1, background: C.background, width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, flex: "none", background: "#fff", display: "flex", alignItems: "center", position: "relative" }}>
        <button aria-label="Back" onClick={() => { if (window.history.length > 1) router.back(); else router.push("/profile"); }} style={{ width: 48, height: 48, margin: "0 4px", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <Icon name="arrow_back" size={u.sp(24)} color={C.textDark} />
        </button>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: u.sp(18), fontWeight: 500, color: C.textDark }}>{t("changePassword")}</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: isWeb ? 600 : undefined, padding: `${u.h(24)}px ${isWeb ? u.w(48) : u.w(16)}px`, boxSizing: "border-box" }}>
          {isWeb && (
            <>
              <div style={{ fontSize: u.sp(28), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("changePassword")}</div>
              <div style={{ height: u.h(8) }} />
              <div style={{ fontSize: u.sp(15), color: C.textLight, lineHeight: 1.5 }}>{t("secureAccount")}</div>
              <div style={{ height: u.h(32) }} />
            </>
          )}
          <div style={{ background: "#fff", borderRadius: u.r(16), boxShadow: "0 4px 20px rgba(0,0,0,.04)", padding: isWeb ? u.w(32) : u.w(20) }}>
            <Field label={t("currentPassword")} hint={t("enterCurrentPassword")} value={cur} onChange={setCur} error={errs.cur} />
            <div style={{ height: u.h(24) }} />
            <Field label={t("newPassword")} hint={t("enterNewPassword")} value={next} onChange={setNext} error={errs.next} />
            <div style={{ height: u.h(24) }} />
            <Field label={t("confirmPassword")} hint={t("reEnterNewPassword")} value={conf} onChange={setConf} error={errs.conf} />
          </div>
          <div style={{ height: u.h(24) }} />
          <div style={{ padding: u.w(16), background: withOpacity(BLUE, 0.05), borderRadius: u.r(12), border: `1px solid ${withOpacity(BLUE, 0.2)}` }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Icon name="info_outline" size={u.sp(20)} color={BLUE} /><span style={{ width: u.w(12) }} />
              <span style={{ fontSize: u.sp(14), fontWeight: 500, color: C.textDark }}>{t("passwordRequirements")}</span>
            </div>
            <div style={{ height: u.h(12) }} />
            {tip(t("passwordMinLength6Tip"))}<div style={{ height: u.h(8) }} />
            {tip(t("passwordUpperLower"))}<div style={{ height: u.h(8) }} />
            {tip(t("passwordNumbersSpecial"))}<div style={{ height: u.h(8) }} />
            {tip(t("avoidCommonWords"))}
          </div>
          <div style={{ height: u.h(32) }} />
          <CustomButton text={t("changePassword")} isLoading={auth.isLoading} onPressed={() => void submit()} />
        </div>
      </div>
    </div>
  );
}
