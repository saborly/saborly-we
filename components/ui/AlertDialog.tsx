"use client";
import { ReactNode } from "react";
import { Dialog } from "./primitives";
import { MButton } from "./MButton";
import { C } from "@/lib/colors";
import { useScreen } from "@/lib/screenutil";

/** Material 3 AlertDialog (shape radius 16.r, surface white, padding 24, actions right-aligned with 8px spacing) */
export function AlertDialogBox({ open, onClose, title, content, actions, dismissible = true }: {
  open: boolean; onClose: () => void; title: ReactNode; content: ReactNode; actions: ReactNode; dismissible?: boolean;
}) {
  const u = useScreen();
  return (
    <Dialog open={open} onClose={onClose} dismissible={dismissible}>
      <div role="dialog" style={{
        background: "#fff", borderRadius: u.r(16), padding: 24, minWidth: 280, maxWidth: 560, boxSizing: "border-box", maxHeight: "100%", overflowY: "auto",
        boxShadow: "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
      }}>
        <div>{title}</div>
        <div style={{ height: 16 }} />
        <div>{content}</div>
        <div style={{ height: 24 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>
      </div>
    </Dialog>
  );
}

/** TextButton as used in dialog actions */
export function DialogTextButton({ label, onClick, color, fontWeight }: { label: string; onClick: () => void; color: string; fontWeight?: number }) {
  const u = useScreen();
  return <MButton variant="text" onClick={onClick} fg={color} fontSize={u.sp(14)} fontWeight={fontWeight ?? 500}>{label}</MButton>;
}

export const dialogTitleStyle = (sp: (n: number) => number) => ({ fontSize: sp(18), fontWeight: 500, color: C.textDark } as const);
