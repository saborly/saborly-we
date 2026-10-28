"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton, CustomTextField } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { VisibilityToggle } from "@/components/auth/password";
import { EMAIL_RE } from "@/components/screens/LoginScreen";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { authStore, requestPasswordReset, resendPasswordResetOTP, resetPassword, useAuth, verifyPasswordResetOTP } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

const GREEN = "#4CAF50", RED = "#F44336";

// Port of lib/features/auth/screens/authforgot.dart (3-step forgot password flow)
export function ForgotPasswordScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [email, setEmail] = useState(""), [otp, setOtp] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [emailSent, setEmailSent] = useState(false), [otpVerified, setOtpVerified] = useState(false);
  const [obscure, setObscure] = useState(true), [obscureConfirm, setObscureConfirm] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [errs, setErrs] = useState<Record<string, string | null>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobile = u.width < 600;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const startTimer = () => {
    setCountdown(60);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setCountdown((c) => { if (c > 0) return c - 1; if (timer.current) clearInterval(timer.current); return c; }), 1000);
  };

  const validate = () => {
    const e: Record<string, string | null> = {};
    if (!otpVerified) {
      if (!email) e.email = t("pleaseEnterEmail");
      else if (!EMAIL_RE.test(email)) e.email = t("pleaseEnterValidEmail");
    }
    if (emailSent && !otpVerified) {
      if (!otp) e.otp = t("pleaseEnterCode");
      else if (otp.length !== 6) e.otp = t("codeMustBe6Digits");
    }
    if (otpVerified) {
      if (!password) e.password = t("pleaseEnterPassword");
      else if (password.length < 6) e.password = t("passwordMinLength");
      if (!confirm) e.confirm = t("pleaseConfirmPassword");
      else if (confirm !== password) e.confirm = t("passwordsDoNotMatch");
    }
    setErrs(e);
    return !Object.values(e).some(Boolean);
  };
  const err = () => authStore.state.error;

  const request = async () => {
    if (!validate()) return;
    if (await requestPasswordReset(email.trim())) { setEmailSent(true); startTimer(); showSnack(t("resetCodeSent"), { bg: GREEN }); }
    else showSnack(err() ?? t("failedToSendResetCode"), { bg: RED });
  };
  const verify = async () => {
    if (otp.trim().length !== 6) { showSnack(t("invalid6DigitCode"), { bg: RED }); return; }
    if (await verifyPasswordResetOTP(email.trim(), otp.trim())) { setOtpVerified(true); showSnack(t("codeVerified"), { bg: GREEN }); }
    else showSnack(err() ?? t("invalidOrExpiredCode"), { bg: RED });
  };
  const reset = async () => {
    if (!validate()) return;
    if (await resetPassword({ email: email.trim(), newPassword: password, confirmPassword: confirm })) { showSnack(t("passwordResetSuccess"), { bg: GREEN }); router.push(ROUTES.home); }
    else showSnack(err() ?? t("failedToResetPassword"), { bg: RED });
  };
  const resend = async () => {
    if (await resendPasswordResetOTP(email.trim())) { startTimer(); showSnack(t("newCodeSent"), { bg: GREEN }); }
    else showSnack(err() ?? t("failedToSendCode"), { bg: RED });
  };
  const onBack = () => {
    if (emailSent && !otpVerified) { setEmailSent(false); setOtp(""); }
    else if (otpVerified) { setOtpVerified(false); setPassword(""); setConfirm(""); }
    else router.back();
  };

  const title = otpVerified ? t("createNewPassword") : emailSent ? t("verifyCode") : t("forgotPassword");
  const subtitle = otpVerified ? t("enterNewPasswordSubtitle") : emailSent ? t("enterCodeSubtitle").replace("{email}", email) : t("enterEmailSubtitle");
  const btnText = otpVerified ? t("resetPasswordButton") : emailSent ? t("verifyCodeButton") : t("sendResetCode");
  const btnAction = otpVerified ? reset : emailSent ? verify : request;
  const gap = (a: number, b: number) => <div style={{ height: mobile ? a : u.h(b) }} />;
  const textBtn = (label: string, onClick: (() => void) | undefined, o: { color?: string; fs: number; pad: number }) => (
    <button disabled={!onClick} onClick={onClick} style={{ border: 0, background: "transparent", cursor: onClick ? "pointer" : "default", padding: `${o.pad}px 12px`, minHeight: 40, fontSize: o.fs, color: o.color ?? C.primary, fontWeight: 500, fontFamily: "inherit", width: "100%" }}>{label}</button>
  );

  return (
    <div style={{ flex: 1, background: C.background, width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center", background: C.background }}>
        <button aria-label="Back" onClick={onBack} style={{ width: 48, height: 48, margin: "0 4px", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrow_back" size={mobile ? 22 : 24} color={C.textDark} />
        </button>
        <span style={{ width: 16 }} />
        <span style={{ fontFamily: "var(--font-bree), serif", fontSize: mobile ? 18 : u.sp(20), fontWeight: 700, color: C.textDark }}>{t("resetPassword")}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
        <div style={{ padding: mobile ? 20 : u.w(24), width: "100%", maxWidth: mobile ? u.width : 500 + 2 * u.w(24), boxSizing: "border-box" }}>
          {gap(15, 20)}
          <div style={{ textAlign: "center" }}><Icon name="lock_reset" size={mobile ? 70 : u.sp(80)} color={C.primary} /></div>
          {gap(20, 24)}
          <div style={{ textAlign: "center", fontSize: mobile ? 22 : u.sp(24), fontWeight: 700 }}>{title}</div>
          {gap(10, 12)}
          <div style={{ textAlign: "center", fontSize: mobile ? 13 : u.sp(14), color: "#757575" }}>{subtitle}</div>
          {gap(26, 32)}
          {!otpVerified && <CustomTextField value={email} onChange={setEmail} labelText={t("email")} hintText={t("enterYourEmail")} type="email" prefixIcon="email" enabled={!emailSent} error={errs.email} />}
          {emailSent && !otpVerified && (
            <>
              {gap(14, 16)}
              <CustomTextField value={otp} onChange={setOtp} labelText={t("verificationCode")} hintText={t("enter6DigitCode")} type="tel" prefixIcon="security" maxLength={6} error={errs.otp} />
            </>
          )}
          {otpVerified && (
            <>
              {gap(14, 16)}
              <CustomTextField value={password} onChange={setPassword} labelText={t("newPassword")} hintText={t("enterNewPassword")} obscureText={obscure} prefixIcon="lock" error={errs.password}
                suffix={<VisibilityToggle obscure={!obscure} onToggle={() => setObscure(!obscure)} />} />
              {gap(14, 16)}
              <CustomTextField value={confirm} onChange={setConfirm} labelText={t("confirmPassword")} hintText={t("reEnterNewPassword")} obscureText={obscureConfirm} prefixIcon="lock" error={errs.confirm}
                suffix={<VisibilityToggle obscure={!obscureConfirm} onToggle={() => setObscureConfirm(!obscureConfirm)} />} />
            </>
          )}
          {gap(20, 24)}
          <CustomButton text={btnText} isLoading={auth.isLoading} onPressed={auth.isLoading ? undefined : () => void btnAction()} />
          {emailSent && !otpVerified && (
            <>
              {gap(12, 16)}
              {textBtn(countdown > 0 ? t("resendCodeCountdown").replace("{seconds}", String(countdown)) : t("resendCode"), countdown > 0 ? undefined : () => void resend(), { fs: mobile ? 13 : 14, pad: mobile ? 8 : 10, color: countdown > 0 ? "#9E9E9E" : C.primary })}
            </>
          )}
          {gap(12, 16)}
          {textBtn(t("backToLogin"), () => router.push(ROUTES.login), { fs: mobile ? 13 : 14, pad: mobile ? 8 : 10 })}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
