"use client";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { C } from "@/lib/colors";

/** Material InkWell-ish clickable: pointer cursor + pressed/hover tint via CSS vars (no layout effect). */
export function Tap({ onClick, style, children, className, disabled, title, ariaLabel }: {
  onClick?: (e: React.MouseEvent) => void; style?: CSSProperties; children?: ReactNode; className?: string;
  disabled?: boolean; title?: string; ariaLabel?: string;
}) {
  return (
    <div role="button" tabIndex={disabled ? -1 : 0} aria-label={ariaLabel} title={title} className={className}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick?.(e as any); } }}
      style={{ cursor: disabled ? "default" : "pointer", outline: "none", ...style }}>
      {children}
    </div>
  );
}

/** CircularProgressIndicator (indeterminate, Material 3 look) */
export function Spinner({ size = 36, color = C.primary, stroke = 4 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" style={{ animation: "spin 1.4s linear infinite", flex: "none" }}>
      <circle cx="25" cy="25" r={25 - stroke / 2 - 0.5} fill="none" stroke={color} strokeWidth={stroke * (50 / size)}
        strokeLinecap="round" strokeDasharray="90 150" />
    </svg>
  );
}

/** Overlay dialog (showDialog): scrim 54% black, centered child, Esc/scrim closes unless dismissible=false */
export function Dialog({ open, onClose, children, dismissible = true, zIndex = 9000 }: {
  open: boolean; onClose?: () => void; children: ReactNode; dismissible?: boolean; zIndex?: number;
}) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, dismissible, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.54)", padding: 40 }}
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose?.(); }}>
      {children}
    </div>
  );
}

/** Popup anchored under/over a trigger (DropdownButton / PopupMenu) */
export function usePopup() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

export const fmt2 = (n: number) => n.toFixed(2); // Dart toStringAsFixed(2) — both use the exact binary value
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** showModalBottomSheet(isScrollControlled, transparent bg): scrim + slide-up child, tap scrim / Esc closes */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { if (open) { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); } setShown(false); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: shown ? "rgba(0,0,0,.54)" : "rgba(0,0,0,0)", transition: "background 250ms", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 640, maxHeight: "92%", overflowY: "auto", transform: shown ? "translateY(0)" : "translateY(100%)", transition: "transform 250ms cubic-bezier(.215,.61,.355,1)" }}>{children}</div>
    </div>
  );
}
