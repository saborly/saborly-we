"use client";
import { api } from "../api";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, isValidLanguage, translate } from "../i18n";
import { prefs } from "../storage";
import { Store, useStore } from "../store";

const KEY = "app_language";

// LanguageService + AppStrings.setLanguage + ApiService.setLanguage kept in sync (main.dart)
export const languageStore = new Store({ language: DEFAULT_LANGUAGE });

export function initLanguage() {
  const saved = prefs.getString(KEY);
  const lang = saved && isValidLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  api.setLanguage(lang);
  languageStore.set({ language: lang });
}

export function changeLanguage(code: string) {
  if (!isValidLanguage(code)) throw new Error(`Unsupported language: ${code}`);
  if (languageStore.state.language !== code) {
    prefs.set(KEY, code);
    api.setLanguage(code);
    languageStore.set({ language: code });
  }
}

export function useLanguage() {
  const { language } = useStore(languageStore);
  const option = SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[1];
  const t = (key: string) => translate(key, language);
  return { language, option, isRTL: option.isRTL, dir: option.isRTL ? ("rtl" as const) : ("ltr" as const), t };
}
