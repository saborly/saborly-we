"use client";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScreenProvider } from "@/lib/screenutil";
import { checkAuthStatus } from "@/lib/stores/auth";
import { initCart } from "@/lib/stores/cart";
import { homeInitializeIfNeeded, homeSetLanguage, menuSetLanguage } from "@/lib/stores/catalog";
import { loadBranches, loadNotifications } from "@/lib/stores/commerce";
import { initLanguage, languageStore, useLanguage } from "@/lib/stores/language";
import { setOffersLanguage } from "@/lib/stores/offers";
import { Toaster } from "@/components/ui/Toast";
import { ReelsViewerHost } from "@/components/home/ReelsViewer";

let bootstrapped = false;
/** lib/main.dart _runApp(): ApiService init, language sync, cart + notifications init (order preserved). */
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  api.loadBranchFromPrefs();
  api.loadSelectedLocationFromPrefs();
  initLanguage();
  loadNotifications();
  initCart();
  void checkAuthStatus();
  void homeInitializeIfNeeded(languageStore.state.language);
  void loadBranches();
}

/** ChangeNotifierProxyProvider<LanguageService, …>: propagate language changes to Home/Menu/Offers */
function LanguageSync({ children }: { children: ReactNode }) {
  const { language, dir } = useLanguage();
  useEffect(() => {
    homeSetLanguage(language);
    menuSetLanguage(language);
    setOffersLanguage(language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { bootstrap(); setReady(true); }, []);
  if (!ready) return null;
  return (
    <ScreenProvider>
      <LanguageSync>
        {children}
        <ReelsViewerHost />
        <Toaster />
      </LanguageSync>
    </ScreenProvider>
  );
}
