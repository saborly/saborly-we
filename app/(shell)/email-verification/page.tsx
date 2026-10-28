"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EmailVerificationScreen } from "@/components/screens/EmailVerificationScreen";

function Inner() {
  const email = useSearchParams().get("email") ?? "";
  return <div className="fx-plain" style={{ display: "contents" }}><EmailVerificationScreen email={email} /></div>;
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
