import translations from "./translations.json";
import aliases from "./aliases.json";

type Dict = Record<string, Record<string, string>>;
const T = translations as Dict;

/** AppStrings.get(key): current language -> 'es' -> key itself */
export function translate(key: string, lang: string): string {
  key = (aliases as Record<string, string>)[key] ?? key; // AppStrings getters whose name differs from the key (defaultLabel -> default)
  return T[lang]?.[key] ?? T.es?.[key] ?? key;
}

export interface LanguageOption {
  code: string; name: string; nativeName: string; flag: string; flagAsset: string; countryCode: string; isRTL: boolean;
}
// lib/core/services/language_service.dart (flag assets are copied under /public/assets/images)
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", flagAsset: "/assets/images/uk_flag.png", countryCode: "GB", isRTL: false },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", flagAsset: "/assets/images/spain_flag.png", countryCode: "ES", isRTL: false },
  { code: "ca", name: "Catalan", nativeName: "Català", flag: "🏴", flagAsset: "/assets/images/catalan_flag.png", countryCode: "CT", isRTL: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", flagAsset: "/assets/images/arabic_flag.png", countryCode: "SA", isRTL: true },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", flagAsset: "/assets/images/french_flag.png", countryCode: "FR", isRTL: false },
];
export const DEFAULT_LANGUAGE = "es";

const LOCALIZED_NAMES: Record<string, Record<string, string>> = {
  en: { en: "English", es: "Spanish", ca: "Catalan", ar: "Arabic", fr: "French" },
  es: { en: "Inglés", es: "Español", ca: "Catalán", ar: "Árabe", fr: "Francés" },
  ca: { en: "Anglès", es: "Espanyol", ca: "Català", ar: "Àrab", fr: "Francès" },
  ar: { en: "الإنجليزية", es: "الإسبانية", ca: "الكاتالونية", ar: "العربية", fr: "الفرنسية" },
  fr: { en: "Anglais", es: "Espagnol", ca: "Catalan", ar: "Arabe", fr: "Français" },
};
export function localizedLanguageName(current: string, code: string): string {
  return LOCALIZED_NAMES[current]?.[code] ?? SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
export const isValidLanguage = (code: string) => SUPPORTED_LANGUAGES.some((l) => l.code === code);
