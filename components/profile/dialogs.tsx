"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/primitives";
import { MButton } from "@/components/ui/MButton";
import { AlertDialogBox, DialogTextButton, dialogTitleStyle } from "@/components/ui/AlertDialog";
import { showSnack } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";
import { deleteAccount, signOut, updateProfile, useAuth } from "@/lib/stores/auth";
import { useLanguage } from "@/lib/stores/language";

// Port of profile/widgets/profile_dialogs.dart

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const app = t("appName");
  return (
    <AlertDialogBox open={open} onClose={onClose}
      title={<div style={{ display: "flex", alignItems: "center" }}><Icon name="info" size={u.sp(24)} color={C.primary} /><span style={{ width: u.w(8) }} /><span style={dialogTitleStyle(u.sp)}>{t("aboutApp").replace("{appName}", app)}</span></div>}
      content={
        <div>
          <div style={{ fontSize: u.sp(14), color: C.textLight }}>{t("appVersion")}</div>
          <div style={{ height: u.h(16) }} />
          <div style={{ fontSize: u.sp(14), color: C.textMedium }}>{t("appDescription").replace("{appName}", app)}</div>
          <div style={{ height: u.h(16) }} />
          <div style={{ fontSize: u.sp(12), color: C.textLight }}>{t("copyright").replace("{appName}", app)}</div>
          <div style={{ height: u.h(8) }} />
          <div style={{ fontSize: u.sp(12), color: C.textLight }}>{t("companyAddress")}</div>
        </div>
      }
      actions={<DialogTextButton label={t("close")} onClick={onClose} color={C.primary} fontWeight={600} />} />
  );
}

function OutlinedField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const u = useScreen();
  const [focused, setFocused] = useState(false);
  const floated = focused || value !== "";
  const color = focused ? C.primary : C.textLight;
  return (
    <div style={{ position: "relative", background: "#FFFBF6", borderRadius: u.r(20), border: `${focused ? 1.6 : 1}px solid ${focused ? C.primary : C.border}`, boxSizing: "border-box" }}>
      <label style={{
        position: "absolute", left: 14, top: floated ? -9 : 17, padding: floated ? "0 4px" : 0, background: floated ? "#fff" : "transparent", fontSize: floated ? 12 : 16, color,
        pointerEvents: "none", transition: "all 150ms", lineHeight: "18px",
      }}>{label}</label>
      <input value={value} type={type} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", boxSizing: "border-box", border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 16, color: C.textDark, padding: `${u.h(16)}px ${u.w(18)}px` }} />
    </div>
  );
}

export function EditProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const { t } = useLanguage();
  const auth = useAuth();
  const [first, setFirst] = useState(auth.user?.firstName ?? ""), [last, setLast] = useState(auth.user?.lastName ?? ""), [phone, setPhone] = useState(auth.user?.phone ?? "");
  const radius = `${u.r(10)}px`;
  const save = async () => {
    const ok = await updateProfile(first.trim(), last.trim(), phone.trim());
    if (ok) { onClose(); showSnack(t("profileUpdatedSuccessfully"), { bg: C.success, radius }); }
    else showSnack(t("failedToUpdateProfile"), { bg: C.error, radius });
  };
  return (
    <AlertDialogBox open={open} onClose={onClose} title={<span style={dialogTitleStyle(u.sp)}>{t("editProfile")}</span>}
      content={
        <div style={{ minWidth: 232, paddingTop: 8 }}>
          <OutlinedField label={t("firstName")} value={first} onChange={setFirst} />
          <div style={{ height: u.h(12) }} />
          <OutlinedField label={t("lastName")} value={last} onChange={setLast} />
          <div style={{ height: u.h(12) }} />
          <OutlinedField label={t("phoneNumber")} value={phone} onChange={setPhone} type="tel" />
        </div>
      }
      actions={
        <>
          <DialogTextButton label={t("cancel")} onClick={onClose} color={C.textLight} />
          <MButton onClick={() => void save()} disabled={auth.isLoading} radius={u.r(8)}>
            {auth.isLoading ? <Spinner size={u.w(16)} stroke={2} color="#fff" /> : <span style={{ fontSize: u.sp(14), color: "#fff", fontWeight: 500 }}>{t("save")}</span>}
          </MButton>
        </>
      } />
  );
}

export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <AlertDialogBox open={open} onClose={onClose} title={<span style={dialogTitleStyle(u.sp)}>{t("signOut")}</span>}
      content={<div style={{ fontSize: u.sp(14), color: C.textMedium }}>{t("areYouSureSignOut")}</div>}
      actions={
        <>
          <DialogTextButton label={t("cancel")} onClick={onClose} color={C.textLight} />
          <MButton bg={C.error} radius={u.r(8)} padding={[u.h(12), u.w(24)]} onClick={async () => { await signOut(); onClose(); router.push(ROUTES.home); }}>
            <span style={{ fontSize: u.sp(14), color: "#fff", fontWeight: 500 }}>{t("signOut")}</span>
          </MButton>
        </>
      } />
  );
}

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = useScreen();
  const router = useRouter();
  const { t } = useLanguage();
  const auth = useAuth();
  const radius = `${u.r(10)}px`;
  const confirm = async () => {
    const ok = await deleteAccount();
    onClose();
    if (ok) { showSnack(t("accountDeletedSuccessfully"), { bg: C.success, radius }); router.push(ROUTES.home); }
    else showSnack(t("failedToDeleteAccount"), { bg: C.error, radius });
  };
  return (
    <AlertDialogBox open={open} onClose={onClose}
      title={<div style={{ display: "flex", alignItems: "center" }}><Icon name="warning_amber_rounded" size={u.sp(24)} color={C.error} /><span style={{ width: u.w(8) }} /><span style={{ ...dialogTitleStyle(u.sp), flex: 1 }}>{t("deleteAccount")}</span></div>}
      content={<div style={{ fontSize: u.sp(14), color: C.textMedium }}>{t("areYouSureDeleteAccount")}</div>}
      actions={
        <>
          <DialogTextButton label={t("cancel")} onClick={onClose} color={C.textLight} />
          <MButton bg={C.error} radius={u.r(8)} padding={[u.h(12), u.w(24)]} disabled={auth.isLoading} onClick={() => void confirm()}>
            {auth.isLoading ? <Spinner size={u.w(16)} stroke={2} color="#fff" /> : <span style={{ fontSize: u.sp(14), color: "#fff", fontWeight: 500 }}>{t("deleteAccount")}</span>}
          </MButton>
        </>
      } />
  );
}
