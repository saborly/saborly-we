"use client";
import { ReactNode, useEffect, useState } from "react";
import { C } from "@/lib/colors";
import { Icon } from "./Icon";

/**
 * SliverAppBar(expandedHeight, pinned, backgroundColor: primary) with a parallax FlexibleSpaceBar showing the shared
 * "gradient + two circles + icon/title/subtitle" hero used by the FAQ and Privacy screens. Scroll offsets come from the
 * shell scroller (#main-scroll).
 */
export function GradientHero({ expanded, icon, title, subtitle }: { expanded: number; icon: string; title: string; subtitle: string }) {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (!el) return;
    const on = () => setScroll(el.scrollTop);
    on(); el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  const min = 56, max = expanded;
  const height = Math.max(min, max - scroll);
  const t = Math.min(Math.max((max - height) / (max - min), 0), 1);
  const fadeStart = Math.max(0, 1 - min / max);
  const opacity = 1 - Math.min(Math.max((t - fadeStart) / (1 - fadeStart), 0), 1);
  const parallax = -(t * (max - min)) / 4;
  return (
    <>
      <div style={{ height: max, flex: "none" }} />
      <div style={{ position: "sticky", top: 0, height: 0, zIndex: 20 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: -max, height, background: C.primary, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: parallax, height: max, opacity, background: `linear-gradient(135deg, ${C.primary}, rgba(216,78,23,.8))` }}>
            <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
            <div style={{ position: "absolute", bottom: -30, left: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ padding: 20, background: "rgba(255,255,255,.2)", borderRadius: 20, display: "flex" }}><Icon name={icon} size={56} color="#fff" /></div>
              <div style={{ height: 20 }} />
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: 0.5, textAlign: "center" }}>{title}</div>
              <div style={{ height: 8 }} />
              <div style={{ fontSize: 16, color: "rgba(255,255,255,.9)", letterSpacing: 0.3 }}>{subtitle}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** _ResponsiveLayout: max width 900 (>1200), 700 (>600) else full */
export function ResponsiveColumn({ width, children }: { width: number; children: ReactNode }) {
  const maxWidth = width > 1200 ? 900 : width > 600 ? 700 : undefined;
  return <div style={{ display: "flex", justifyContent: "center" }}><div style={{ width: "100%", maxWidth }}>{children}</div></div>;
}
