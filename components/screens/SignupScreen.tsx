"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton, CustomTextField } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { PasswordField, PasswordStrengthIndicator, validateNewPassword } from "@/components/auth/password";
import { AuthBackBar, EMAIL_RE, errorSnack } from "@/components/screens/LoginScreen";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { authStore, signUp, useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

type Errs = Partial<Record<"first" | "last" | "email" | "phone" | "password" | "confirm", string | null>>;

// Port of lib/features/auth/screens/signup_screen.dart (+ signup/widgets/*)
export function SignupScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [first, setFirst] = useState(""), [last, setLast] = useState(""), [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<Errs>({});
  const isLarge = u.width >= 800, isTablet = u.width >= 600;

  const validate = () => {
    const e: Errs = {};
    if (!first) e.first = t("pleaseEnterName");
    if (!last) e.last = t("pleaseEnterName");
    if (!email) e.email = t("pleaseEnterEmail");
    else if (!EMAIL_RE.test(email)) e.email = t("pleaseEnterValidEmail");
    if (!phone) e.phone = t("pleaseEnterPhone");
    e.password = validateNewPassword(password, t("pleaseEnterPassword"), t("passwordRequirements"));
    if (!confirm) e.confirm = t("pleaseEnterPassword");
    else if (confirm !== password) e.confirm = t("passwordsDontMatch");
    setErrs(e);
    return !Object.values(e).some(Boolean);
  };
  const green = "#4CAF50", snackRadius = `${u.r(10)}px`;
  const handleSignUp = async () => {
    if (!validate()) return;
    const ok = await signUp(first.trim(), last.trim(), email.trim(), phone.trim(), password);
    if (ok) {
      if (authStore.state.requiresVerification) {
        showSnack(t("verificationCodeSent"), { bg: green, radius: snackRadius, durationMs: 3000 });
        router.push(`${ROUTES.emailVerification}?email=${encodeURIComponent(email.trim())}`);
      } else {
        showSnack(t("accountCreatedSuccess"), { bg: green, radius: snackRadius });
        router.push(ROUTES.home);
      }
    } else errorSnack(u, authStore.state.error ?? t("failedToCreateAccount"));
  };

  const nameField = (v: string, set: (s: string) => void, label: string, err?: string | null) => (
    <CustomTextField value={v} onChange={set} labelText={label} prefixIcon="person_outline" autoCapitalize="words" error={err} />
  );
  const form = (tablet: boolean) => (
    <div>
      {tablet ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{nameField(first, setFirst, t("firstName"), errs.first)}</div>
          <span style={{ width: u.w(16) }} />
          <div style={{ flex: 1, minWidth: 0 }}>{nameField(last, setLast, t("lastName"), errs.last)}</div>
        </div>
      ) : (
        <>
          {nameField(first, setFirst, t("firstName"), errs.first)}
          <div style={{ height: u.h(16) }} />
          {nameField(last, setLast, t("lastName"), errs.last)}
        </>
      )}
      <div style={{ height: u.h(20) }} />
      <CustomTextField value={email} onChange={setEmail} labelText={t("email")} type="email" prefixIcon="email_outlined" error={errs.email} />
      <div style={{ height: u.h(20) }} />
      <CustomTextField value={phone} onChange={setPhone} labelText={t("phoneNumber")} type="tel" prefixIcon="phone_outlined" error={errs.phone} />
      <div style={{ height: u.h(20) }} />
      {tablet ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PasswordField value={password} onChange={setPassword} label={t("password")} error={errs.password} />
            {password && <PasswordStrengthIndicator password={password} />}
          </div>
          <span style={{ width: u.w(16) }} />
          <div style={{ flex: 1, minWidth: 0 }}><PasswordField value={confirm} onChange={setConfirm} label={t("confirmPassword")} error={errs.confirm} /></div>
        </div>
      ) : (
        <>
          <PasswordField value={password} onChange={setPassword} label={t("password")} error={errs.password} />
          {password && <PasswordStrengthIndicator password={password} />}
          <div style={{ height: u.h(16) }} />
          <PasswordField value={confirm} onChange={setConfirm} label={t("confirmPassword")} error={errs.confirm} />
        </>
      )}
      <div style={{ height: u.h(40) }} />
      <CustomButton text={t("signUp")} isLoading={auth.isLoading} onPressed={() => void handleSignUp()} />
    </div>
  );
  const signInLink = (
    <div style={{ textAlign: "center", fontSize: u.sp(14), color: C.textMedium }}>
      {t("alreadyHaveAccount")}{" "}
      <Link href={ROUTES.login} style={{ color: C.primary, fontWeight: 500, cursor: "pointer", textDecoration: "none", padding: "8px 4px" }}>{t("signIn")}</Link>
    </div>
  );

  if (isLarge) {
    const features = [t("secureCheckout"), t("personalizedRecommendations"), t("exclusiveBenefits"), t("customerSupport")];
    return (
      <div style={{ flex: 1, display: "flex", background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.05)}, #fff, ${withOpacity(C.primary, 0.02)})`, width: "100%" }}>
        <div style={{ flex: 5, minWidth: 0, padding: u.w(60), boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: u.w(80), height: u.w(80), background: C.primary, borderRadius: u.r(20), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="shopping_bag_outlined" size={u.sp(40)} color="#fff" /></div>
          <div style={{ height: u.h(40) }} />
          <div style={{ fontSize: u.sp(48), fontWeight: 800, color: C.textDark, lineHeight: 1.1 }}>{t("joinApp").replace("{appName}", t("appName"))}</div>
          <div style={{ height: u.h(20) }} />
          <div style={{ fontSize: u.sp(18), color: C.textLight, lineHeight: 1.6 }}>{t("createAccountDescription")}</div>
          <div style={{ height: u.h(60) }} />
          {features.map((f) => (
            <div key={f} style={{ paddingBottom: u.h(16), display: "flex", alignItems: "center" }}>
              <div style={{ width: u.w(24), height: u.w(24), background: withOpacity(C.primary, 0.1), borderRadius: u.r(12), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="check" size={u.sp(16)} color={C.primary} /></div>
              <span style={{ width: u.w(16) }} />
              <span style={{ flex: 1, fontSize: u.sp(16), color: C.textMedium, fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 4, minWidth: 0, display: "flex" }}>
          <div style={{ margin: u.w(40), flex: 1, minWidth: 0, background: C.cardBackground, borderRadius: u.r(24), boxShadow: "0 5px 5px -3px rgba(26,8,3,.2), 0 8px 10px 1px rgba(26,8,3,.14), 0 3px 14px 2px rgba(26,8,3,.12)", padding: u.w(48), boxSizing: "border-box", overflowY: "auto" }}>
            <div style={{ display: "flex" }}>
              <button aria-label="Back" onClick={() => router.back()} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow_back" size={u.sp(24)} color={C.textDark} /></button>
            </div>
            <div style={{ height: u.h(20) }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: u.sp(32), fontWeight: 700, color: C.textDark, lineHeight: 1.2 }}>{t("createAccount")}</div>
              <div style={{ height: u.h(12) }} />
              <div style={{ fontSize: u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{t("fillInDetails")}</div>
            </div>
            <div style={{ height: u.h(40) }} />
            {form(true)}
            <div style={{ height: u.h(40) }} />
            {signInLink}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, background: "#fff", width: "100%", display: "flex", flexDirection: "column" }}>
      <AuthBackBar onBack={() => router.back()} />
      <div style={{ padding: `0 ${isTablet ? u.w(48) : u.w(24)}px`, boxSizing: "border-box" }}>
        <div style={{ height: u.h(20) }} />
        <div style={{ fontSize: u.sp(28), fontWeight: 700, color: C.textDark, lineHeight: 1.2 }}>{t("createAccount")}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ fontSize: u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{t("signUpToStart").replace("{appName}", t("appName"))}</div>
        <div style={{ height: u.h(32) }} />
        {form(isTablet)}
        <div style={{ height: u.h(32) }} />
        {signInLink}
        <div style={{ height: u.h(40) }} />
      </div>
    </div>
  );
}
