"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/stores/auth";
import { ROUTES } from "@/lib/nav";

/** AppRoutes.router redirect(): protected routes (checkout, payment, profile) bounce to /login when not signed in. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, checked } = useAuth();
  const router = useRouter();
  useEffect(() => { if (checked && !isAuthenticated) router.replace(ROUTES.login); }, [checked, isAuthenticated, router]);
  if (!checked || !isAuthenticated) return null;
  return <>{children}</>;
}
