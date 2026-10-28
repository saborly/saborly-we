"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton } from "@/components/ui/forms";
import { showSnack } from "@/components/ui/Toast";
import { AuthBackBar } from "@/components/screens/LoginScreen";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { authStore, resendOTP, useAuth, verifyOTP } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

const GREEN = "#4CAF50";

// Port of lib/features/auth/screens/eemailVerificationScreen.dart (OTPVerificationScreen)
export function EmailVerificationScreen({ email }: { email: string }) {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [remaining, setRemaining] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const large = u.width > 600;
  const snackRadius = `${u.r(10)}px`;

  const startTimer = () => {
    let left = 600;
    setRemaining(600); setCanResend(false);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (left > 0) { left--; setRemaining(left); }
      else { setCanResend(true); if (timer.current) clearInterval(timer.current); }
    }, 1000);
  };
  useEffect(() => { startTimer(); return () => { if (timer.current) clearInterval(timer.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const otp = digits.join("");
  const clearOtp = () => { setDigits(["", "", "", "", "", ""]); inputs.current[0]?.focus(); };
  const fmt = `${String(Math.trunc(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  const handleVerify = async () => {
    const ok = await verifyOTP(email, otp);
    if (ok) { showSnack(t("emailVerifiedSuccess"), { bg: GREEN, radius: snackRadius, durationMs: 2000 }); router.push(ROUTES.home); }
    else { clearOtp(); showSnack(authStore.state.error ?? t("invalidOrExpiredOTP"), { bg: C.error, radius: snackRadius }); }
  };
  const handleResend = async () => {
    if (await resendOTP(email)) { clearOtp(); startTimer(); showSnack(t("newCodeSent"), { bg: GREEN, radius: snackRadius, durationMs: 3000 }); }
    else showSnack(authStore.state.error ?? t("failedToSendCode"), { bg: C.error, radius: snackRadius });
  };

  const onChange = (i: number, v: string) => {
    const nd = [...digits]; nd[i] = v.slice(0, 1); setDigits(nd);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    else if (!v && i > 0) inputs.current[i - 1]?.focus();
  };
  const resendActive = canResend && !auth.isLoading;
  const timerColor = canResend ? C.error : C.primary;

  return (
    <div style={{ flex: 1, background: "#fff", width: "100%", display: "flex", flexDirection: "column" }}>
      <AuthBackBar onBack={() => { if (window.history.length > 1) router.back(); else router.push(ROUTES.login); }} />
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: large ? 500 : undefined, padding: `0 ${large ? u.w(40) : u.w(24)}px`, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ height: large ? u.h(40) : u.h(20) }} />
          <div style={{ width: u.w(100), height: u.w(100), borderRadius: "50%", background: withOpacity(C.primary, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="email_outlined" size={u.sp(50)} color={C.primary} /></div>
          <div style={{ height: u.h(24) }} />
          <div style={{ textAlign: "center", fontSize: u.sp(28), fontWeight: 700, color: C.textDark, lineHeight: 1.2 }}>{t("verifyYourEmail")}</div>
          <div style={{ height: u.h(12) }} />
          <div style={{ textAlign: "center", fontSize: u.sp(16), color: C.textLight, lineHeight: 1.4 }}>{t("sentVerificationCode")}</div>
          <div style={{ height: u.h(4) }} />
          <div style={{ textAlign: "center", fontSize: u.sp(16), color: C.primary, fontWeight: 500, lineHeight: 1.4 }}>{email}</div>
          <div style={{ height: large ? u.h(60) : u.h(40) }} />
          <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { inputs.current[i] = el; }} className="otp-box" value={d} maxLength={1} inputMode="numeric" onChange={(e) => onChange(i, e.target.value)}
                style={{
                  width: u.w(54), height: u.h(72), boxSizing: "border-box", textAlign: "center", fontFamily: "inherit", fontSize: u.sp(26), fontWeight: 700, color: C.accentNight, caretColor: C.primary,
                  background: withOpacity(C.accentSand, 0.3), borderRadius: u.r(12), padding: 0, outline: 0, border: `1.5px solid ${C.border}`,
                }} />
            ))}
          </div>
          <div style={{ height: u.h(24) }} />
          <div style={{ display: "inline-flex", alignItems: "center", padding: `${u.h(12)}px ${u.w(16)}px`, background: withOpacity(timerColor, 0.1), borderRadius: u.r(8) }}>
            <Icon name={canResend ? "access_time" : "timer_outlined"} size={u.sp(20)} color={timerColor} /><span style={{ width: u.w(8) }} />
            <span style={{ fontSize: u.sp(14), color: timerColor, fontWeight: 500 }}>{canResend ? t("codeExpired") : t("codeExpiresIn").replace("{time}", fmt)}</span>
          </div>
          <div style={{ height: u.h(32) }} />
          <div style={{ width: "100%" }}><CustomButton text="Verify Email" isLoading={auth.isLoading} onPressed={otp.length === 6 ? () => void handleVerify() : undefined} /></div>
          <div style={{ height: u.h(24) }} />
          <button disabled={!resendActive} onClick={() => void handleResend()} style={{ border: 0, background: "transparent", cursor: resendActive ? "pointer" : "default", padding: "8px 12px", minHeight: 40, fontFamily: "inherit", fontSize: u.sp(14), color: C.textMedium }}>
            {t("didntReceiveCode")}<span style={{ color: resendActive ? C.primary : C.textLight, fontWeight: 500 }}>{t("resend")}</span>
          </button>
          <div style={{ height: large ? u.h(60) : u.h(40) }} />
        </div>
      </div>
    </div>
  );
}
