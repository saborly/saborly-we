"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { ScreenBar } from "@/components/ui/ScreenBar";
import { showSnack } from "@/components/ui/Toast";
import { FoodKingFooter } from "@/components/home/more";
import { submitContactForm } from "@/lib/banners";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";

type Field = "name" | "email" | "phone" | "subject" | "message";

function TextField({ label, hint, icon, value, onChange, error, type, maxLines = 1, isWeb }: {
  label: string; hint: string; icon: string; value: string; onChange: (v: string) => void; error?: string | null; type?: string; maxLines?: number; isWeb: boolean;
}) {
  const u = useScreen();
  const [focused, setFocused] = useState(false);
  const border = error ? `${focused ? 2 : 1}px solid ${C.error}` : focused ? `2px solid ${C.primary}` : "1px solid #E0E0E0";
  const font = { fontSize: isWeb ? u.sp(16) : u.sp(14), color: C.textDark, fontFamily: "inherit" } as const;
  const common = { flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", resize: "none" as const, padding: `${u.h(16)}px ${u.w(16)}px ${u.h(16)}px 0`, ...font };
  return (
    <div className="ctf">
      <div style={{ fontSize: isWeb ? u.sp(16) : u.sp(14), fontWeight: 500, color: C.textDark }}>{label}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ display: "flex", alignItems: maxLines > 1 ? "flex-start" : "center", background: "#FAFAFA", borderRadius: u.r(12), border, boxSizing: "border-box" }}>
        <span style={{ padding: `${maxLines > 1 ? u.h(16) : 0}px 12px 0 12px`, display: "flex" }}><Icon name={icon} size={u.sp(22)} color={C.primary} /></span>
        {maxLines > 1
          ? <textarea rows={maxLines} value={value} placeholder={hint} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={common} />
          : <input value={value} type={type ?? "text"} placeholder={hint} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={common} />}
      </div>
      {error && <div style={{ fontSize: u.sp(12), color: C.error, marginTop: 8, padding: "0 16px", lineHeight: 1.33 }}>{error}</div>}
    </div>
  );
}

function InfoCard({ title, icon, isWeb, children }: { title: string; icon: string; isWeb: boolean; children: React.ReactNode }) {
  const u = useScreen();
  return (
    <div style={{ padding: isWeb ? u.w(28) : u.w(20), background: "#fff", borderRadius: u.r(16), border: `1.5px solid ${withOpacity(C.primary, 0.2)}`, boxShadow: "0 4px 12px rgba(0,0,0,.05)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: u.w(12), background: withOpacity(C.primary, 0.1), borderRadius: u.r(10), display: "flex" }}><Icon name={icon} size={u.sp(24)} color={C.primary} /></div>
        <span style={{ width: u.w(12) }} />
        <span style={{ fontSize: isWeb ? u.sp(20) : u.sp(18), fontWeight: 700, color: C.textDark }}>{title}</span>
      </div>
      <div style={{ height: u.h(20) }} />
      {children}
    </div>
  );
}
function InfoItem({ icon, text, isWeb }: { icon: string; text: string; isWeb: boolean }) {
  const u = useScreen();
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <Icon name={icon} size={u.sp(20)} color={C.primary} /><span style={{ width: u.w(12), flex: "none" }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: isWeb ? u.sp(16) : u.sp(14), color: C.textMedium, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
function PhoneItem({ phone, isWeb }: { phone: string; isWeb: boolean }) {
  const u = useScreen();
  return (
    <a href={`tel:${phone.replace(/ /g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", textDecoration: "none", borderRadius: u.r(8) }}>
      <Icon name="phone_in_talk" size={u.sp(20)} color={C.primary} /><span style={{ width: u.w(12) }} />
      <span style={{ fontSize: isWeb ? u.sp(16) : u.sp(14), fontWeight: 500, color: C.primary, textDecoration: "underline", lineHeight: 1.5 }}>{phone}</span>
    </a>
  );
}
function SocialButton({ icon, url }: { icon: string; url: string }) {
  const u = useScreen();
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: u.w(14), background: "rgba(255,255,255,.2)", border: "2px solid #fff", borderRadius: "50%", display: "flex", boxSizing: "content-box" }}>
      <Icon name={icon} size={u.sp(24)} color="#fff" />
    </a>
  );
}

// Port of lib/features/menu/screens/theContactScreen.dart (+ contact/widgets/*)
export function ContactScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const isWeb = u.width >= 1024;
  const [vals, setVals] = useState<Record<Field, string>>({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errs, setErrs] = useState<Partial<Record<Field, string | null>>>({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k: Field) => (v: string) => setVals((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: typeof errs = {};
    if (!vals.name) e.name = t("pleaseEnterName");
    if (!vals.email) e.email = t("pleaseEnterEmail");
    else if (!vals.email.includes("@")) e.email = t("pleaseEnterValidEmail");
    if (vals.phone && !/^\+?[1-9]\d{1,14}$/.test(vals.phone)) e.phone = t("pleaseEnterValidPhone");
    if (!vals.subject) e.subject = t("pleaseEnterSubject");
    if (!vals.message) e.message = t("pleaseEnterMessage");
    setErrs(e);
    return !Object.values(e).some(Boolean);
  };
  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const r = await submitContactForm({ name: vals.name.trim(), email: vals.email.trim(), subject: vals.subject.trim(), message: vals.message.trim(), phone: vals.phone.trim() || undefined });
      setSubmitting(false);
      if (r.success) {
        showSnack(t("formSubmissionSuccess"), { bg: C.success, radius: `${u.r(8)}px`, durationMs: 4000 });
        setVals({ name: "", email: "", phone: "", subject: "", message: "" }); setErrs({});
      } else showSnack(t("formSubmissionError"), { bg: C.error, radius: `${u.r(8)}px`, durationMs: 4000 });
    } catch {
      setSubmitting(false);
      showSnack(t("unexpectedError"), { bg: C.error, radius: `${u.r(8)}px` });
    }
  };

  const hpad = isWeb ? u.w(60) : u.w(16);
  const contentW = Math.min(u.w(1400), u.width) - 2 * hpad;
  const form = (
    <div style={{ padding: isWeb ? u.w(40) : u.w(24), background: "#fff", borderRadius: u.r(16), boxShadow: "0 4px 20px rgba(0,0,0,.08)", boxSizing: "border-box" }}>
      <div style={{ fontSize: isWeb ? u.sp(28) : u.sp(22), fontWeight: 700, color: C.textDark }}>{t("sendUsMessage")}</div>
      <div style={{ height: u.h(32) }} />
      <TextField isWeb={isWeb} label={t("fullName")} hint={t("yourName")} icon="person_outline" value={vals.name} onChange={set("name")} error={errs.name} />
      <div style={{ height: u.h(20) }} />
      <TextField isWeb={isWeb} label={t("email")} hint={t("yourEmail")} icon="email_outlined" type="email" value={vals.email} onChange={set("email")} error={errs.email} />
      <div style={{ height: u.h(20) }} />
      <TextField isWeb={isWeb} label={t("phoneNumber")} hint={t("yourPhone")} icon="phone_outlined" type="tel" value={vals.phone} onChange={set("phone")} error={errs.phone} />
      <div style={{ height: u.h(20) }} />
      <TextField isWeb={isWeb} label={t("subject")} hint={t("yourSubject")} icon="subject" value={vals.subject} onChange={set("subject")} error={errs.subject} />
      <div style={{ height: u.h(20) }} />
      <TextField isWeb={isWeb} label={t("message")} hint={t("yourMessage")} icon="message_outlined" maxLines={5} value={vals.message} onChange={set("message")} error={errs.message} />
      <div style={{ height: u.h(32) }} />
      <MButton fullWidth disabled={submitting} onClick={() => void submit()} style={{ height: u.h(56) }}>
        {submitting ? <Spinner size={u.w(20)} stroke={2} color="#fff" /> : <span style={{ fontSize: isWeb ? u.sp(18) : u.sp(16), fontWeight: 500 }}>{t("sendMessage")}</span>}
      </MButton>
    </div>
  );
  const phoneLabel = (s: string) => <div style={{ fontSize: isWeb ? u.sp(15) : u.sp(13), fontWeight: 700, color: C.textDark }}>{s}</div>;
  const info = (
    <div>
      <InfoCard title={t("callUs")} icon="phone" isWeb={isWeb}>
        {phoneLabel("Sabadell")}<div style={{ height: u.h(8) }} />
        <PhoneItem phone="669 37 85 28" isWeb={isWeb} /><div style={{ height: u.h(8) }} />
        <PhoneItem phone="935 35 92 24" isWeb={isWeb} /><div style={{ height: u.h(16) }} />
        {phoneLabel("Barcelona")}<div style={{ height: u.h(8) }} />
        <PhoneItem phone="932 11 20 72" isWeb={isWeb} /><div style={{ height: u.h(8) }} />
        <PhoneItem phone="619 80 70 84" isWeb={isWeb} /><div style={{ height: u.h(12) }} />
        <InfoItem icon="access_time" text={t("businessHours")} isWeb={isWeb} />
      </InfoCard>
      <div style={{ height: u.h(20) }} />
      <InfoCard title={t("visitUs")} icon="location_on" isWeb={isWeb}><InfoItem icon="place" text={t("address")} isWeb={isWeb} /></InfoCard>
      <div style={{ height: u.h(20) }} />
      <InfoCard title={t("writeUs")} icon="email" isWeb={isWeb}>
        <InfoItem icon="email" text={t("infoEmail")} isWeb={isWeb} /><div style={{ height: u.h(12) }} />
        <InfoItem icon="support_agent" text={t("supportEmail")} isWeb={isWeb} />
      </InfoCard>
      <div style={{ height: u.h(20) }} />
      <div style={{ padding: isWeb ? u.w(28) : u.w(20), background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius: u.r(16), boxShadow: `0 6px 16px ${withOpacity(C.primary, 0.3)}`, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
        <div style={{ fontSize: isWeb ? u.sp(20) : u.sp(18), fontWeight: 700, color: "#fff" }}>{t("followUs")}</div>
        <div style={{ height: u.h(20) }} />
        <div style={{ width: "100%", display: "flex", justifyContent: "space-evenly" }}>
          <SocialButton icon="facebook" url="https://www.facebook.com/SaborlyBurger/" />
          <SocialButton icon="camera_alt" url="https://www.instagram.com/saborly.es/?igsh=eDg0a2FvZ2Zqbmg%3D&utm_source=qr#" />
          <SocialButton icon="play_arrow" url="https://www.youtube.com/@saborlyburger" />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, background: isWeb ? "#FAFAFA" : "#fff", width: "100%" }}>
      <ScreenBar title={t("contactUs")} titleSize={isWeb ? u.sp(24) : u.sp(20)} elevation={0.5} onBack={() => { if (window.history.length > 1) router.back(); else router.push(ROUTES.profile); }} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: u.w(1400), padding: `${isWeb ? u.h(40) : u.h(24)}px ${hpad}px`, boxSizing: "border-box" }}>
          {isWeb && contentW > 900 ? (
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 5, minWidth: 0 }}>{form}</div>
              <span style={{ width: u.w(40), flex: "none" }} />
              <div style={{ flex: 4, minWidth: 0 }}>{info}</div>
            </div>
          ) : (
            <div>{form}<div style={{ height: u.h(32) }} />{info}</div>
          )}
        </div>
      </div>
      <div style={{ height: isWeb ? u.h(60) : u.h(40) }} />
      {isWeb && <FoodKingFooter />}
    </div>
  );
}
