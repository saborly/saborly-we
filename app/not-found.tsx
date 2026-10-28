"use client";
import { usePathname } from "next/navigation";

// GoRouter errorBuilder: Scaffold(body: Center(Text("Page not found: ${matchedLocation}")))
export default function NotFound() {
  const path = usePathname();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF3E7", fontSize: 14, color: "#28140E" }}>
      Page not found: {path}
    </div>
  );
}
