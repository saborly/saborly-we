"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { PasswordField } from "@/components/auth/password";
import { AuthBackBar } from "@/components/screens/LoginScreen";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

const SEC_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const GREEN = "#4CAF50";

// Port of lib/features/auth/screens/authreset.dart (+ authreset/widgets/*).
// NOTE: like the Flutter screen, the submit simulates the API with a 2s delay (no real request is made).
export function ResetPasswordScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [errs, setErrs] = useState<{ password?: string | null; confirm?: string | null }>({});
  const isLarge = u.width >= 800, isTablet = u.width >= 600;
  const snackRadius = `${u.r(10)}px`;

  const submit = async () => {
    const e: typeof errs = {};
    // the tablet layout uses AppStrings.get(...) messages, the phone layout uses literal English strings
    if (!password) e.password = t("pleaseEnterPassword");
    else if (password.length < 8) e.password = isTablet ? t("passwordMinLength8Error") : "Password must be at least 8 characters";
    else if (!SEC_RE.test(password)) e.password = isTablet ? t("passwordSecurityError") : "Password must meet security requirements";
    if (!confirm) e.confirm = t("pleaseEnterPassword");
    else if (confirm !== password) e.confirm = t("passwordsDontMatch");
    setErrs(e);
    if (e.password || e.confirm) return;
    await new Promise((r) => setTimeout(r, 2000));
    setDone(true);
    showSnack(t("passwordUpdatedSuccess"), { bg: GREEN, radius: snackRadius });
  };

  const form = (
    <div>
      {isTablet ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}><PasswordField value={password} onChange={setPassword} label={t("newPassword")} error={errs.password} /></div>
          <span style={{ width: u.w(16) }} />
          <div style={{ flex: 1, minWidth: 0 }}><PasswordField value={confirm} onChange={setConfirm} label={t("confirmPassword")} error={errs.confirm} /></div>
        </div>
      ) : (
        <>
          <PasswordField value={password} onChange={setPassword} label={t("newPassword")} error={errs.password} />
          <div style={{ height: u.h(20) }} />
          <PasswordField value={confirm} onChange={setConfirm} label={t("confirmPassword")} error={errs.confirm} />
        </>
      )}
      <div style={{ height: u.h(32) }} />
      <CustomButton text={t("updatePassword")} isLoading={auth.isLoading} onPressed={() => void submit()} />
    </div>
  );
  const success = (
    <div>
      <div style={{ padding: u.w(24), background: withOpacity(GREEN, 0.1), borderRadius: u.r(16), border: `1px solid ${withOpacity(GREEN, 0.2)}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Icon name="check_circle" size={u.sp(48)} color={GREEN} />
        <div style={{ height: u.h(16) }} />
        <div style={{ fontSize: u.sp(18), fontWeight: 500, color: "#388E3C" }}>{t("passwordResetSuccess")}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ textAlign: "center", fontSize: u.sp(14), color: C.textMedium }}>{t("passwordResetSuccessDescription")}</div>
      </div>
      <div style={{ height: u.h(24) }} />
      <div style={{ padding: u.w(16), background: withOpacity(C.primary, 0.05), borderRadius: u.r(12), border: `1px solid ${withOpacity(C.primary, 0.1)}`, display: "flex", alignItems: "center" }}>
        <Icon name="security" size={u.sp(20)} color={C.primary} /><span style={{ width: u.w(12) }} />
        <span style={{ flex: 1, fontSize: u.sp(12), color: C.textMedium }}>{t("passwordSecurityTip")}</span>
      </div>
    </div>
  );
  const signIn = <CustomButton text={t("signInNow")} onPressed={() => router.push(ROUTES.login)} />;

  if (isLarge) {
    const reqs = [t("passwordMinLength8"), t("passwordUpperLower"), t("passwordNumber"), t("passwordSpecialChar")];
    return (
      <div style={{ flex: 1, display: "flex", width: "100%", background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.05)}, #fff, ${withOpacity(C.primary, 0.02)})` }}>
        <div style={{ flex: 5, minWidth: 0, padding: u.w(60), boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: u.w(80), height: u.w(80), background: C.primary, borderRadius: u.r(20), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={done ? "check_circle" : "security"} size={u.sp(40)} color="#fff" /></div>
          <div style={{ height: u.h(40) }} />
          <div style={{ fontSize: u.sp(48), fontWeight: 800, color: C.textDark, lineHeight: 1.1 }}>{done ? t("allSet") : t("createNewPassword")}</div>
          <div style={{ height: u.h(20) }} />
          <div style={{ fontSize: u.sp(18), color: C.textLight, lineHeight: 1.6 }}>{done ? t("passwordUpdatedDescription") : t("newPasswordRequirements")}</div>
          {!done && (
            <>
              <div style={{ height: u.h(60) }} />
              {reqs.map((r) => (
                <div key={r} style={{ paddingBottom: u.h(16), display: "flex", alignItems: "center" }}>
                  <div style={{ width: u.w(24), height: u.w(24), background: withOpacity(C.primary, 0.1), borderRadius: u.r(12), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="check" size={u.sp(16)} color={C.primary} /></div>
                  <span style={{ width: u.w(16) }} />
                  <span style={{ flex: 1, fontSize: u.sp(16), color: C.textMedium, fontWeight: 500 }}>{r}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ flex: 4, minWidth: 0, display: "flex" }}>
          <div style={{ margin: u.w(40), flex: 1, minWidth: 0, background: C.cardBackground, borderRadius: u.r(24), boxShadow: "0 5px 5px -3px rgba(26,8,3,.2), 0 8px 10px 1px rgba(26,8,3,.14), 0 3px 14px 2px rgba(26,8,3,.12)", padding: u.w(48), boxSizing: "border-box", overflowY: "auto" }}>
            <div style={{ display: "flex" }}>
              <button aria-label="Back" onClick={() => router.push(ROUTES.login)} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow_back" size={u.sp(24)} color={C.textDark} /></button>
            </div>
            <div style={{ height: u.h(20) }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: u.w(80), height: u.w(80), background: withOpacity(done ? GREEN : C.primary, 0.1), borderRadius: u.r(20), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={done ? "check_circle" : "security"} size={u.sp(40)} color={done ? GREEN : C.primary} /></div>
              <div style={{ height: u.h(24) }} />
              <div style={{ textAlign: "center", fontSize: u.sp(32), fontWeight: 700, color: C.textDark, lineHeight: 1.2 }}>{done ? t("passwordUpdated") : t("resetPassword")}</div>
              <div style={{ height: u.h(12) }} />
              <div style={{ textAlign: "center", fontSize: u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{done ? t("passwordChanged") : t("createStrongPassword")}</div>
            </div>
            <div style={{ height: u.h(40) }} />
            {done ? success : form}
            <div style={{ height: u.h(40) }} />
            {done && signIn}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, background: "#fff", width: "100%", display: "flex", flexDirection: "column" }}>
      <AuthBackBar onBack={() => router.push(ROUTES.login)} />
      <div style={{ padding: `0 ${isTablet ? u.w(48) : u.w(24)}px`, boxSizing: "border-box" }}>
        <div style={{ height: u.h(40) }} />
        <div style={{ width: u.w(64), height: u.w(64), background: withOpacity(done ? GREEN : C.primary, 0.1), borderRadius: u.r(16), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={done ? "check_circle" : "security"} size={u.sp(32)} color={done ? GREEN : C.primary} /></div>
        <div style={{ height: u.h(24) }} />
        <div style={{ fontSize: u.sp(28), fontWeight: 700, color: C.textDark, lineHeight: 1.2 }}>{done ? t("passwordUpdated") : t("resetPassword")}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ fontSize: u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{done ? t("passwordChanged") : t("createStrongPassword")}</div>
        <div style={{ height: u.h(40) }} />
        {done ? success : form}
        <div style={{ height: u.h(32) }} />
        {done && signIn}
        <div style={{ height: u.h(40) }} />
      </div>
    </div>
  );
}
