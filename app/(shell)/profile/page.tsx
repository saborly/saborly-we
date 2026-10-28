"use client";
import { AuthGuard } from "@/components/AuthGuard";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
export default function Page() { return <div className="fx-plain" style={{ display: "contents" }}><AuthGuard><ProfileScreen /></AuthGuard></div>; }
