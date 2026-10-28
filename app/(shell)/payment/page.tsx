"use client";
import { AuthGuard } from "@/components/AuthGuard";
import { PaymentScreen } from "@/components/screens/PaymentScreen";
export default function Page() { return <AuthGuard><PaymentScreen /></AuthGuard>; }
