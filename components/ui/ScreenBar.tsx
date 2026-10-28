"use client";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colors";
import { Icon } from "./Icon";
import { ROUTES } from "@/lib/nav";
import { useScreen } from "@/lib/screenutil";

/**
 * Scaffold AppBar for screens rendered inside the shell scroller: sticky so the body scrolls underneath (like Scaffold.appBar).
 * Matches `AppBar(backgroundColor, elevation, leading: back arrow, title, centerTitle)`.
 */
export function ScreenBar({ title, titleSize, titleWeight = 700, bg = "#fff", elevation = 0, onBack, trailing, centerTitle = true, backIcon = "arrow_back", backSize, titleColor = C.textDark }: {
  title: ReactNode; titleSize: number; titleWeight?: number; bg?: string; elevation?: number; onBack?: () => void; trailing?: ReactNode;
  centerTitle?: boolean; backIcon?: string; backSize?: number; titleColor?: string;
}) {
  const router = useRouter();
  const u = useScreen();
  const back = onBack ?? (() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push(ROUTES.home); });
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, height: 56, flex: "none", background: bg, boxShadow: elevation ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,.06)` : "none", display: "flex", alignItems: "center", width: "100%" }}>
      <button aria-label="Back" onClick={back} style={{ width: 48, height: 48, margin: "0 4px", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <Icon name={backIcon} size={backSize ?? u.sp(24)} color={C.textDark} />
      </button>
      {centerTitle ? (
        <div style={{ position: "absolute", left: 56, right: 56, textAlign: "center", fontFamily: "var(--font-bree), serif" /* AppBar.titleTextStyle */, fontSize: titleSize, fontWeight: titleWeight, color: titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      ) : (
        <div style={{ marginLeft: 16, fontFamily: "var(--font-bree), serif", fontSize: titleSize, fontWeight: titleWeight, color: titleColor }}>{title}</div>
      )}
      {trailing && <div style={{ marginLeft: "auto", zIndex: 1 }}>{trailing}</div>}
    </div>
  );
}
