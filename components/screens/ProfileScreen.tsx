"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, withOpacity } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { CustomButton } from "@/components/ui/forms";
import { MButton } from "@/components/ui/MButton";
import { FoodKingFooter } from "@/components/home/more";
import { AboutDialog, DeleteAccountDialog, EditProfileDialog, SignOutDialog } from "@/components/profile/dialogs";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";
import type { User } from "@/lib/models";

type Dlg = "about" | "edit" | "signOut" | "delete" | null;
const initials = (u: User) => `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

// Port of lib/features/menu/screens/profile_screen.dart (+ profile/widgets/*). kIsWeb => no AppBar.
export function ProfileScreen() {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const [dlg, setDlg] = useState<Dlg>(null);
  const close = () => setDlg(null);
  const go = (r: string) => router.push(r);

  let body: React.ReactNode;
  if (!auth.user) {
    body = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Icon name="person_outline" size={u.sp(80)} color={C.textLight} />
        <div style={{ height: u.h(16) }} />
        <div style={{ fontSize: u.sp(18), fontWeight: 500, color: C.textDark }}>{t("loginToContinue")}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ fontSize: u.sp(14), color: C.textLight, textAlign: "center" }}>{t("signInPrompt")}</div>
        <div style={{ height: u.h(24) }} />
        <CustomButton text={t("signIn")} onPressed={() => go(ROUTES.login)} width={u.w(200)} />
        <div style={{ height: u.h(12) }} />
        <CustomButton text={t("signUp")} isOutlined onPressed={() => go(ROUTES.signup)} width={u.w(200)} />
      </div>
    );
  } else if (u.width >= 768) {
    body = <WebLayout user={auth.user} onDialog={setDlg} go={go} />;
  } else {
    body = <MobileLayout user={auth.user} onDialog={setDlg} go={go} />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.background }}>
      {body}
      {auth.user && u.width >= 768 && <FoodKingFooter />}
      <AboutDialog open={dlg === "about"} onClose={close} />
      {dlg === "edit" && <EditProfileDialog open onClose={close} />}
      <SignOutDialog open={dlg === "signOut"} onClose={close} />
      <DeleteAccountDialog open={dlg === "delete"} onClose={close} />
    </div>
  );
}

type LayoutProps = { user: User; onDialog: (d: Dlg) => void; go: (r: string) => void };

/* ---------- mobile (<768) ---------- */
const mobileCard = (u: ReturnType<typeof useScreen>): React.CSSProperties => ({ margin: `0 ${u.w(16)}px`, background: "#fff", borderRadius: u.r(16), boxShadow: "0 2px 10px rgba(0,0,0,.05)" });

function MobileLayout({ user, onDialog, go }: LayoutProps) {
  const u = useScreen();
  const { t } = useLanguage();
  const items: { icon: string; title: string; subtitle: string; onTap: () => void }[] = [
    { icon: "receipt_long", title: t("orderHistory"), subtitle: t("viewPastOrders"), onTap: () => go(ROUTES.orders) },
    { icon: "lock", title: t("changePassword"), subtitle: t("updatePassword"), onTap: () => go(ROUTES.changePassword) },
    { icon: "help_outline", title: t("faq"), subtitle: t("frequentlyAskedQuestions"), onTap: () => go(ROUTES.faq) },
    { icon: "info", title: t("about"), subtitle: t("learnAboutUs"), onTap: () => onDialog("about") },
    { icon: "privacy_tip_outlined", title: t("privacy"), subtitle: t("privacyPolicy"), onTap: () => go(ROUTES.privacy) },
    { icon: "info", title: t("contactUs"), subtitle: t("contactUs"), onTap: () => go(ROUTES.contact) },
    { icon: "store_mall_directory_outlined", title: "Change Branch", subtitle: "Switch to a different branch", onTap: () => go(ROUTES.branchChange) },
    { icon: "notifications", title: t("notifications"), subtitle: t("notificationPreferences"), onTap: () => go(ROUTES.notifications) },
  ];
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: u.h(16) }} />
      <div style={{ ...mobileCard(u), padding: u.w(20), display: "flex", alignItems: "center" }}>
        <div style={{ width: u.w(80), height: u.h(80), borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: u.sp(24), fontWeight: 700, color: "#fff", flex: "none" }}>{initials(user)}</div>
        <span style={{ width: u.w(16) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: u.sp(20), fontWeight: 700, color: C.textDark }}>{fullName(user)}</div>
          <div style={{ height: u.h(4) }} />
          <div style={{ fontSize: u.sp(14), color: C.textLight }}>{user.email}</div>
          <div style={{ fontSize: u.sp(14), color: C.textLight }}>{user.phone}</div>
        </div>
        <button aria-label="edit" onClick={() => onDialog("edit")} style={{ width: 48, height: 48, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={24} color={C.primary} /></button>
      </div>
      <div style={{ height: u.h(24) }} />
      <div style={mobileCard(u)}>
        {items.map((it, i) => (
          <div key={i}>
            <div onClick={it.onTap} style={{ display: "flex", alignItems: "center", padding: `${u.h(4)}px ${u.w(16)}px`, minHeight: 72, boxSizing: "border-box", cursor: "pointer" }}>
              <div style={{ width: u.w(40), height: u.h(40), background: withOpacity(C.primary, 0.1), borderRadius: u.r(8), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={it.icon} size={u.sp(20)} color={C.primary} /></div>
              <span style={{ width: 16 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: u.sp(16), fontWeight: 500, color: C.textDark }}>{it.title}</div>
                <div style={{ fontSize: u.sp(12), color: C.textLight }}>{it.subtitle}</div>
              </div>
              <Icon name="arrow_forward_ios" size={u.sp(16)} color={C.textLight} />
            </div>
            {i < items.length - 1 && <div style={{ height: 1, background: C.divider, marginInlineStart: u.w(56) }} />}
          </div>
        ))}
      </div>
      <div style={{ height: u.h(24) }} />
      <div style={{ ...mobileCard(u), padding: u.w(20), textAlign: "center" }}>
        <div style={{ fontSize: u.sp(24), fontWeight: 700, color: C.primary }}>{t("appName")}</div>
        <div style={{ height: u.h(8) }} />
        <div style={{ fontSize: u.sp(14), color: C.textLight }}>{t("appVersion")}</div>
        <div style={{ height: u.h(16) }} />
        <CustomButton text={t("deleteAccount")} isOutlined textColor={C.error} onPressed={() => onDialog("delete")} />
        <div style={{ height: u.h(12) }} />
        <CustomButton text={t("signOut")} isOutlined textColor={C.error} onPressed={() => onDialog("signOut")} />
      </div>
      <div style={{ height: u.h(32) }} />
    </div>
  );
}

/* ---------- web (>=768) ---------- */
function WebLayout({ user, onDialog, go }: LayoutProps) {
  const u = useScreen();
  const { t } = useLanguage();
  const card: React.CSSProperties = { padding: u.w(24), background: "#fff", borderRadius: u.r(12), boxShadow: "0 2px 8px rgba(0,0,0,.04)" };

  const quick = (title: string, icon: string, onTap: () => void, destructive = false) => (
    <div key={title} onClick={onTap} style={{ padding: `${u.h(8)}px 0`, display: "flex", alignItems: "center", cursor: "pointer", borderRadius: u.r(6) }}>
      <Icon name={icon} size={u.sp(18)} color={destructive ? C.error : C.textMedium} /><span style={{ width: u.w(12) }} />
      <span style={{ fontSize: u.sp(14), fontWeight: 500, color: destructive ? C.error : C.textDark }}>{title}</span>
      <span style={{ flex: 1 }} />
      <Icon name="arrow_forward_ios" size={u.sp(12)} color={C.textLight} />
    </div>
  );
  const setting = (title: string, icon: string, onTap: () => void) => (
    <div key={title} onClick={onTap} style={{ aspectRatio: "3.5", padding: u.w(16), boxSizing: "border-box", border: "1px solid #EEEEEE", borderRadius: u.r(8), display: "flex", alignItems: "center", cursor: "pointer", minWidth: 0 }}>
      <div style={{ width: u.w(40), height: u.h(40), background: withOpacity(C.primary, 0.1), borderRadius: u.r(8), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={u.sp(22)} color={C.primary} /></div>
      <span style={{ width: u.w(12) }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: u.sp(18), fontWeight: 500, color: C.textDark, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</span>
      <Icon name="arrow_forward_ios" size={u.sp(14)} color={C.textLight} />
    </div>
  );
  const group = (title: string, children: React.ReactNode) => (
    <div style={card}>
      <div style={{ fontSize: u.sp(20), fontWeight: 700, color: C.textDark }}>{title}</div>
      <div style={{ height: u.h(20) }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: u.h(16), columnGap: u.w(16) }}>{children}</div>
    </div>
  );

  return (
    <div style={{ background: "#FAFAFA", padding: u.w(32), boxSizing: "border-box", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1400 }}>
        <div style={{ ...card, padding: `${u.h(20)}px ${u.w(24)}px`, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <div style={{ fontSize: u.sp(28), fontWeight: 700, color: C.textDark, letterSpacing: -0.5 }}>{t("accountManagement")}</div>
          <div style={{ height: u.h(4) }} />
          <div style={{ fontSize: u.sp(16), color: C.textLight }}>{t("manageYourAccount")}</div>
        </div>
        <div style={{ height: u.h(32) }} />
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ width: 350, flex: "none" }}>
            <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", width: u.w(100), height: u.h(100) }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${withOpacity(C.primary, 0.8)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: u.sp(36), fontWeight: 500, color: "#fff" }}>{initials(user)}</div>
                <div style={{ position: "absolute", bottom: 4, right: 4, width: u.w(20), height: u.h(20), borderRadius: "50%", background: "#4CAF50", border: "2px solid #fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ height: u.h(16) }} />
              <div style={{ fontSize: u.sp(22), fontWeight: 700, color: C.textDark, textAlign: "center" }}>{fullName(user)}</div>
              <div style={{ height: u.h(4) }} />
              <div style={{ fontSize: u.sp(14), color: C.textLight, textAlign: "center" }}>{user.email}</div>
              <div style={{ height: u.h(2) }} />
              <div style={{ fontSize: u.sp(14), color: C.textLight, textAlign: "center" }}>{user.phone}</div>
              <div style={{ height: u.h(20) }} />
              <MButton fullWidth onClick={() => onDialog("edit")} padding={[u.h(14), 20]} radius={u.r(8)} fontSize={u.sp(14)} fontWeight={600}>{t("editProfile")}</MButton>
            </div>
            <div style={{ height: u.h(24) }} />
            <div style={{ height: u.h(24) }} />
            <div style={card}>
              <div style={{ fontSize: u.sp(16), fontWeight: 500, color: C.textDark }}>{t("quickActions")}</div>
              <div style={{ height: u.h(16) }} />
              {quick(t("orderHistory"), "history", () => go(ROUTES.orders))}
              {quick(t("faq"), "help_outline", () => go(ROUTES.faq))}
              {quick(t("privacy"), "privacy_tip_outlined", () => go(ROUTES.privacy))}
              <div style={{ height: 1, background: "#EEEEEE", margin: `${u.h(11.5)}px 0` }} />
              {quick(t("deleteAccount"), "delete_outline", () => onDialog("delete"), true)}
              {quick(t("signOut"), "logout", () => onDialog("signOut"), true)}
            </div>
          </div>
          <span style={{ width: u.w(32), flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {group(t("accountSettings"), <>
              {setting(t("personalInformation"), "person_outline", () => onDialog("edit"))}
              {setting(t("orderHistory"), "receipt_long_outlined", () => go(ROUTES.orders))}
            </>)}
            <div style={{ height: u.h(24) }} />
            {group(t("preferences"), <>
              {setting(t("notifications"), "notifications_outlined", () => go(ROUTES.notifications))}
              {setting(t("privacy"), "privacy_tip_outlined", () => go(ROUTES.privacy))}
            </>)}
            <div style={{ height: u.h(24) }} />
            {group(t("securityAndSupport"), <>
              {setting(t("changePassword"), "lock_outline", () => go(ROUTES.changePassword))}
              {setting(t("faq"), "help_outline", () => go(ROUTES.faq))}
              {setting(t("about"), "info_outline", () => go(ROUTES.about))}
              {setting(t("deleteAccount"), "delete_outline", () => onDialog("delete"))}
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
