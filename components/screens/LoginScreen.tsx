"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/primitives";
import { CustomButton, CustomTextField } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { authStore, signIn, signInWithGoogle, useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

export const EMAIL_RE = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

/** AppBar (transparent, 56px) with back arrow: pop when possible, else go home. */
export function AuthBackBar({ onBack }: { onBack?: () => void }) {
  const u = useScreen();
  const router = useRouter();
  return (
    <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center" }}>
      <button aria-label="Back" onClick={onBack ?? (() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push(ROUTES.home); })}
        style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="arrow_back_ios" size={u.sp(20)} color={C.textDark} />
      </button>
    </div>
  );
}

export function errorSnack(u: ReturnType<typeof useScreen>, message: string) {
  showSnack(message, { bg: C.error, radius: `${u.r(10)}px` });
}

// Port of lib/features/auth/screens/login_screen.dart
export function LoginScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [obscure, setObscure] = useState(true);
  const [errs, setErrs] = useState<{ email?: string | null; password?: string | null }>({});
  const large = u.width > 600;

  const validate = () => {
    const e: typeof errs = {};
    if (!email) e.email = t("pleaseEnterEmail");
    else if (!EMAIL_RE.test(email)) e.email = t("pleaseEnterValidEmail");
    if (!password) e.password = t("pleaseEnterPassword");
    else if (password.length < 6) e.password = t("passwordTooShort");
    setErrs(e);
    return !e.email && !e.password;
  };
  const handleSignIn = async () => {
    if (!validate()) return;
    const ok = await signIn(email.trim(), password);
    if (ok) router.push(ROUTES.home);
    else errorSnack(u, authStore.state.error ?? t("failedToLogin"));
  };
  const handleGoogle = async () => {
    const ok = await signInWithGoogle();
    if (ok) router.push(ROUTES.home);
    else errorSnack(u, authStore.state.error ?? "Google sign-in failed");
  };

  return (
    <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", width: "100%" }}>
      <AuthBackBar />
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: large ? 500 : undefined, padding: `0 ${large ? u.w(40) : u.w(24)}px`, boxSizing: "border-box" }}>
          <div style={{ height: large ? u.h(40) : u.h(20) }} />
          <div style={{ fontSize: large ? u.sp(18) : u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{t("welcomeBack")}</div>
          <div style={{ height: large ? u.h(60) : u.h(40) }} />
          <CustomTextField value={email} onChange={setEmail} labelText={t("email")} type="email" prefixIcon="email_outlined" error={errs.email} />
          <div style={{ height: large ? u.h(24) : u.h(16) }} />
          <CustomTextField value={password} onChange={setPassword} labelText={t("password")} obscureText={obscure} prefixIcon="lock_outline" error={errs.password}
            onSubmit={() => void handleSignIn()}
            suffix={<button aria-label="toggle" onClick={() => setObscure(!obscure)} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={obscure ? "visibility_off" : "visibility"} size={24} color={C.textLight} /></button>} />
          <div style={{ height: u.h(8) }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => router.push(ROUTES.forgotPassword)} style={{ border: 0, background: "transparent", cursor: "pointer", padding: "8px 12px", fontSize: u.sp(14), color: C.primary, fontWeight: 500, fontFamily: "inherit" }}>{t("forgotPassword")}</button>
          </div>
          <div style={{ height: large ? u.h(32) : u.h(24) }} />
          <CustomButton text={t("signIn")} isLoading={auth.isLoading} onPressed={() => void handleSignIn()} />
          <div style={{ height: large ? u.h(40) : u.h(30) }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, height: 1, background: withOpacity(C.textLight, 0.3) }} />
            <span style={{ padding: `0 ${u.w(16)}px`, fontSize: u.sp(14), color: C.textLight, fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: withOpacity(C.textLight, 0.3) }} />
          </div>
          <div style={{ height: large ? u.h(40) : u.h(30) }} />
          <SocialButton onClick={auth.isLoading ? undefined : () => void handleGoogle()} label="Continue with Google" loading={auth.isLoading && auth.isSocialLoading} />
          <div style={{ height: large ? u.h(60) : u.h(40) }} />
          <div style={{ textAlign: "center", fontSize: u.sp(14), color: C.textMedium, fontFamily: "var(--font-roboto), Roboto, Arial, sans-serif" /* RichText has no DefaultTextStyle: platform font */ }}>
            {t("dontHaveAccount")}{" "}
            <Link href={ROUTES.signup} style={{ color: C.primary, fontWeight: 500, cursor: "pointer", textDecoration: "none", padding: "8px 4px" }}>{t("signUp")}</Link>
          </div>
          <div style={{ height: large ? u.h(60) : u.h(40) }} />
        </div>
      </div>
    </div>
  );
}

function GoogleLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function SocialButton({ onClick, label, loading }: { onClick?: () => void; label: string; loading: boolean }) {
  const u = useScreen();
  return (
    <div style={{ height: u.h(56), borderRadius: u.r(12), boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
      <button onClick={onClick} disabled={!onClick} style={{
        width: "100%", height: "100%", background: "#fff", border: `1px solid ${withOpacity(C.textLight, 0.15)}`, borderRadius: u.r(12), cursor: onClick ? "pointer" : "default",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", padding: 0,
      }}>
        {loading ? <Spinner size={u.h(24)} stroke={2.5} color="#4285F4" /> : (
          <>
            <GoogleLogo size={u.sp(22)} />
            <span style={{ width: u.w(12) }} />
            <span style={{ fontSize: u.sp(15), fontWeight: 500, color: C.textDark, letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
