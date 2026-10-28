"use client";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { GradientHero, ResponsiveColumn } from "@/components/ui/GradientHero";
import { FoodKingFooter } from "@/components/home/more";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";

const SECTIONS: { icon: string; title: string; content: string; points: string[] }[] = [
  { icon: "info_outline", title: "info_collect_title", content: "info_collect_content", points: [1, 2, 3, 4, 5].map((i) => `info_collect_point${i}`) },
  { icon: "thumb_up_outlined", title: "use_info_title", content: "use_info_content", points: [1, 2, 3, 4, 5, 6].map((i) => `use_info_point${i}`) },
  { icon: "share_outlined", title: "sharing_title", content: "sharing_content", points: [1, 2, 3, 4].map((i) => `sharing_point${i}`) },
  { icon: "security_outlined", title: "security_title", content: "security_content", points: [1, 2, 3, 4, 5].map((i) => `security_point${i}`) },
  { icon: "verified_user_outlined", title: "rights_title", content: "rights_content", points: [1, 2, 3, 4, 5, 6].map((i) => `rights_point${i}`) },
  { icon: "cookie_outlined", title: "cookies_title", content: "cookies_content", points: [1, 2, 3, 4].map((i) => `cookies_point${i}`) },
  { icon: "child_care_outlined", title: "children_privacy_title", content: "children_privacy_content", points: [] },
];

function ContactButton({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ padding: "12px 20px", background: "rgba(255,255,255,.2)", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center" }}>
      <Icon name={icon} size={20} color="#fff" /><span style={{ width: 8 }} />
      <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// Port of lib/features/menu/screens/ourprivacy.dart
export function PrivacyScreen() {
  const u = useScreen();
  const { t } = useLanguage();
  const isDesktop = u.width >= 1200;
  return (
    <div style={{ flex: 1, background: "#F8F9FA", width: "100%" }}>
      <GradientHero expanded={isDesktop ? 280 : 220} icon="privacy_tip_rounded" title={t("privacy")} subtitle={t("privacy_subtitle")} />
      <div style={{ animation: "fadeIn 800ms ease-in-out both" }}>
        <ResponsiveColumn width={u.width}>
          <div style={{ padding: isDesktop ? 48 : 24 }}>
            <div style={{ padding: 24, background: `linear-gradient(90deg, ${withOpacity(C.primary, 0.1)}, ${withOpacity(C.primary, 0.05)})`, borderRadius: 16, border: `1px solid ${withOpacity(C.primary, 0.2)}`, display: "flex", alignItems: "center" }}>
              <Icon name="shield_outlined" size={32} color={C.primary} /><span style={{ width: 16 }} />
              <span style={{ flex: 1, fontSize: 15, color: "#495057", lineHeight: 1.6 }}>{t("privacy_intro")}</span>
            </div>
            <div style={{ height: 32 }} />
            <div style={{ display: "flex", alignItems: "center" }}>
              <Icon name="schedule" size={18} color="#757575" /><span style={{ width: 8 }} />
              <span style={{ color: "#757575", fontSize: 14, fontStyle: "italic" }}>{t("last_updated")}</span>
            </div>
            <div style={{ height: 48 }} />
            {SECTIONS.map((s) => (
              <div key={s.title} style={{ marginBottom: 32, padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ padding: 12, background: withOpacity(C.primary, 0.1), borderRadius: 12, display: "flex" }}><Icon name={s.icon} size={24} color={C.primary} /></div>
                  <span style={{ width: 16 }} />
                  <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: "#2B2D42" }}>{t(s.title)}</span>
                </div>
                <div style={{ height: 16 }} />
                <div style={{ fontSize: 15, color: "#495057", lineHeight: 1.7 }}>{t(s.content)}</div>
                {s.points.length > 0 && (
                  <>
                    <div style={{ height: 16 }} />
                    {s.points.map((k) => (
                      <div key={k} style={{ paddingBottom: 12, display: "flex", alignItems: "flex-start" }}>
                        <div style={{ marginTop: 6, width: 6, height: 6, borderRadius: "50%", background: C.primary, flex: "none" }} />
                        <span style={{ width: 12, flex: "none" }} />
                        <span style={{ flex: 1, fontSize: 15, color: "#495057", lineHeight: 1.6 }}>{t(k)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
            <div style={{ height: 48 }} />
            <div style={{ padding: 28, background: `linear-gradient(90deg, ${C.primary}, rgba(216,78,23,.9))`, borderRadius: 20, boxShadow: `0 8px 20px ${withOpacity(C.primary, 0.3)}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Icon name="support_agent" size={48} color="#fff" />
              <div style={{ height: 16 }} />
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", textAlign: "center" }}>{t("contact_questions")}</div>
              <div style={{ height: 8 }} />
              <div style={{ textAlign: "center", fontSize: 15, color: "rgba(255,255,255,.9)", lineHeight: 1.5 }}>{t("contact_support")}</div>
              <div style={{ height: 24 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                <ContactButton icon="email_outlined" label={t("contact_email")} />
                <ContactButton icon="phone_outlined" label={t("contact_phone")} />
              </div>
            </div>
            <div style={{ height: 32 }} />
          </div>
        </ResponsiveColumn>
      </div>
      {isDesktop && <FoodKingFooter />}
    </div>
  );
}
