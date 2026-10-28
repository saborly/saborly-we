"use client";
import { ReactNode, useEffect } from "react";
import { C } from "@/lib/colors";
import { Store, useStore } from "@/lib/store";
import { useScreen } from "@/lib/screenutil";

// ScaffoldMessenger.showSnackBar equivalent: floating, theme: accentNight bg, radius 18.r, manrope 14.sp w700 white
interface Snack { id: number; message: ReactNode; bg?: string; radius?: string; durationMs: number; action?: { label: string; onClick: () => void } }
const store = new Store<{ current: Snack | null }>({ current: null });
let seq = 0;

export function showSnack(message: ReactNode, o: { bg?: string; durationMs?: number; radius?: string; action?: Snack["action"] } = {}) {
  store.set({ current: { id: ++seq, message, bg: o.bg, radius: o.radius, durationMs: o.durationMs ?? 4000, action: o.action } });
}
export const hideSnack = () => store.set({ current: null });

export function Toaster() {
  const { current } = useStore(store);
  const { sp, r, w } = useScreen();
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => store.set({ current: null }), current.durationMs);
    return () => clearTimeout(t);
  }, [current]);
  if (!current) return null;
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", padding: 16, zIndex: 10000, pointerEvents: "none" }}>
      <div role="status" style={{
        pointerEvents: "auto", background: current.bg ?? C.accentNight, color: "#fff", borderRadius: current.radius ?? r(18), padding: "14px 16px",
        fontSize: sp(14), fontWeight: 700, minWidth: Math.min(344, w(344)), maxWidth: 640, width: "100%",
        boxShadow: "0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ flex: 1 }}>{current.message}</span>
        {current.action && (
          <button onClick={() => { current.action!.onClick(); hideSnack(); }} style={{ color: C.secondary, fontWeight: 800 }}>
            {current.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
