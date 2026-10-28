"use client";
import { AuthGuard } from "@/components/AuthGuard";
import { CheckoutScreen } from "@/components/screens/CheckoutScreen";
export default function Page() { return <AuthGuard><CheckoutScreen /></AuthGuard>; }
