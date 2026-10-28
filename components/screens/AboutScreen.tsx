"use client";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { ScreenBar } from "@/components/ui/ScreenBar";
import { FoodKingFooter } from "@/components/home/more";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useLanguage } from "@/lib/stores/language";
import { useRouter } from "next/navigation";

// Port of lib/features/menu/screens/AboutUsScreen.dart. isWeb = ResponsiveUtils.isWeb (>= 1024)
export function AboutScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const isWeb = u.width >= 1024;
  const app = t("appName");

  const sectionTitle = (title: string) => (
    <div>
      <div style={{ fontSize: isWeb ? u.sp(32) : u.sp(24), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{title}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ width: u.w(60), height: u.h(4), borderRadius: u.r(2), background: `linear-gradient(90deg, ${C.primary}, ${withOpacity(C.primary, 0.5)})` }} />
    </div>
  );
  const valueCard = (title: string, icon: string, desc: string) => (
    <div key={title} style={{ flex: 1, minWidth: 0, padding: isWeb ? u.w(28) : u.w(20), background: "#fff", borderRadius: u.r(12), border: `1.5px solid ${withOpacity(C.primary, 0.2)}`, boxShadow: `0 4px 12px ${withOpacity(C.primary, 0.08)}`, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ padding: u.w(16), background: withOpacity(C.primary, 0.1), borderRadius: "50%", display: "flex" }}><Icon name={icon} size={isWeb ? u.sp(40) : u.sp(32)} color={C.primary} /></div>
      <div style={{ height: u.h(16) }} />
      <div style={{ fontSize: isWeb ? u.sp(22) : u.sp(18), fontWeight: 700, color: C.textDark }}>{title}</div>
      <div style={{ height: u.h(8) }} />
      <div style={{ textAlign: "center", fontSize: isWeb ? u.sp(16) : u.sp(14), color: C.textMedium, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
  const hpad = isWeb ? u.w(60) : u.w(16);
  const contentW = Math.min(u.w(1400), u.width) - 2 * hpad;
  const values = [
    [t("quality"), "star", t("qualityDescription")],
    [t("speed"), "flash_on", t("speedDescription")],
    [t("passion"), "favorite", t("passionDescription")],
  ];
  const gap = isWeb ? u.h(60) : u.h(40);

  return (
    <div style={{ flex: 1, background: isWeb ? "#FAFAFA" : "#fff", width: "100%" }}>
      <ScreenBar title={t("aboutUs")} titleSize={isWeb ? u.sp(24) : u.sp(20)} elevation={0.5} onBack={() => { if (window.history.length > 1) router.back(); else router.push(ROUTES.home); }} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: u.w(1400), padding: `${isWeb ? u.h(40) : u.h(24)}px ${hpad}px`, boxSizing: "border-box" }}>
          <div style={{ padding: isWeb ? u.w(48) : u.w(24), background: `linear-gradient(135deg, ${withOpacity(C.primary, 0.1)}, ${withOpacity(C.primaryLight, 0.2)})`, borderRadius: u.r(16), display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
            <Icon name="restaurant_menu" size={isWeb ? u.sp(80) : u.sp(60)} color={C.primary} />
            <div style={{ height: u.h(24) }} />
            <div style={{ textAlign: "center", fontSize: isWeb ? u.sp(36) : u.sp(28), fontWeight: 800, color: C.textDark, lineHeight: 1.2 }}>{t("welcomeToApp").replace("{appName}", app)}</div>
            <div style={{ height: u.h(16) }} />
            <div style={{ textAlign: "center", fontSize: isWeb ? u.sp(20) : u.sp(16), fontWeight: 500, color: C.textMedium, lineHeight: 1.5 }}>{t("bestFastFoodDestination")}</div>
          </div>
          <div style={{ height: gap }} />
          {sectionTitle(t("ourStory"))}
          <div style={{ height: u.h(24) }} />
          <div style={{ padding: isWeb ? u.w(32) : u.w(20), background: "#fff", borderRadius: u.r(12), boxShadow: "0 4px 10px rgba(0,0,0,.05)" }}>
            <div style={{ textAlign: "justify", fontSize: isWeb ? u.sp(18) : u.sp(15), color: C.textMedium, lineHeight: 1.8 }}>{t("storyDescription").replace("{appName}", app)}</div>
          </div>
          <div style={{ height: gap }} />
          {sectionTitle(t("ourValues"))}
          <div style={{ height: u.h(24) }} />
          {isWeb && contentW > 800 ? (
            <div style={{ display: "flex", alignItems: "stretch" }}>
              {values.map((v, i) => (<span key={i} style={{ display: "contents" }}>{i > 0 && <span style={{ width: u.w(20), flex: "none" }} />}{valueCard(v[0], v[1], v[2])}</span>))}
            </div>
          ) : (
            <div>
              {values.map((v, i) => (<div key={i}>{i > 0 && <div style={{ height: u.h(16) }} />}<div style={{ display: "flex" }}>{valueCard(v[0], v[1], v[2])}</div></div>))}
            </div>
          )}
          <div style={{ height: gap }} />
          <div style={{ padding: isWeb ? u.w(40) : u.w(24), background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius: u.r(16), boxShadow: `0 8px 20px ${withOpacity(C.primary, 0.3)}`, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
            <div style={{ fontSize: isWeb ? u.sp(32) : u.sp(24), fontWeight: 800, color: "#fff" }}>{t("ourMission")}</div>
            <div style={{ height: u.h(20) }} />
            <div style={{ textAlign: "center", fontSize: isWeb ? u.sp(18) : u.sp(15), color: "#fff", lineHeight: 1.8 }}>{t("missionDescription")}</div>
          </div>
          <div style={{ height: gap }} />
        </div>
      </div>
      {isWeb && <FoodKingFooter />}
    </div>
  );
}
