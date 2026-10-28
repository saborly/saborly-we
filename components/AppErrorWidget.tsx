"use client";
import { C } from "@/lib/colors";
import { Icon } from "@/components/ui/Icon";

/** Port of lib/shared/widgets/app_error_widget.dart (release mode: friendly message only; dev shows the error text like kDebugMode) */
export function AppErrorWidget({ message }: { message?: string }) {
  return (
    <div style={{ minHeight: "100dvh", background: C.background, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "var(--font-manrope), sans-serif" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(244,67,54,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="error_outline_rounded" size={32} color={C.error} />
        </div>
        <div style={{ height: 16 }} />
        <div style={{ textAlign: "center", fontSize: 16, fontWeight: 800, color: C.textDark }}>Something went wrong</div>
        <div style={{ height: 6 }} />
        <div style={{ textAlign: "center", fontSize: 13, color: C.textMedium }}>This part of the app hit a snag. Please go back and try again.</div>
        {process.env.NODE_ENV !== "production" && message && (
          <>
            <div style={{ height: 12 }} />
            <div style={{ maxWidth: 420, textAlign: "center", fontSize: 11, color: C.textLight, fontFamily: "monospace", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{message}</div>
          </>
        )}
      </div>
    </div>
  );
}
