"use client";
// Port of web_google_reviews_section.dart's data layer (GooglePlaceSummary, loadGooglePlaces, open status)
import { api } from "./api";
import { translate } from "./i18n";
import {
  durationUntilClosingMs, dartWeekday, getNextOpeningTime, getSpainTime, getTodayHours,
} from "./timeUtils";

export interface GoogleReviewSnippet { author: string; authorPhoto: string | null; text: string; rating: number; relativeTime: string }
export interface GooglePlaceSummary {
  name: string; location: string; rating: number | null; reviewCount: number; priceRange: string | null; category: string;
  mapsUrl: string | null; reviews: GoogleReviewSnippet[];
}
const numOrNull = (v: unknown) => (typeof v === "number" ? v : null);
export function placeFromJson(j: Record<string, any>): GooglePlaceSummary {
  return {
    name: j.name?.toString() ?? "", location: j.location?.toString() ?? "", rating: numOrNull(j.rating),
    reviewCount: Math.trunc(numOrNull(j.reviewCount) ?? 0), priceRange: j.priceRange?.toString() ?? null,
    category: j.category?.toString() ?? "", mapsUrl: j.mapsUrl?.toString() ?? null,
    reviews: ((j.reviews as any[]) ?? []).map((r) => ({
      author: r.author?.toString() ?? "", authorPhoto: r.authorPhoto?.toString() ?? null, text: r.text?.toString() ?? "",
      rating: Math.trunc(numOrNull(r.rating) ?? 5), relativeTime: r.relativeTime?.toString() ?? "",
    })),
  };
}

const RETRY_DELAYS_MS = [2000, 5000];
let placesRequest: Promise<GooglePlaceSummary[]> | null = null;
/** Fetched once per session and shared by the hero rating stat and the reviews section */
export function loadGooglePlaces(): Promise<GooglePlaceSummary[]> {
  if (!placesRequest) {
    placesRequest = (async () => {
      let raw = await api.fetchGoogleReviews();
      for (const d of RETRY_DELAYS_MS) {
        if (raw.length) break;
        await new Promise((r) => setTimeout(r, d));
        raw = await api.fetchGoogleReviews();
      }
      const places = raw.map(placeFromJson);
      if (places.length === 0) placesRequest = null;
      return places;
    })();
  }
  return placesRequest;
}

export function googleRatingSummary(places: GooglePlaceSummary[]): { rating: number; reviewCount: number } | null {
  const rated = places.filter((p) => p.rating != null && p.reviewCount > 0);
  const total = rated.reduce((s, p) => s + p.reviewCount, 0);
  if (total === 0) return null;
  const weighted = rated.reduce((s, p) => s + p.rating! * p.reviewCount, 0);
  return { rating: weighted / total, reviewCount: total };
}

export type OpenState = "open" | "closingSoon" | "closed";
export interface OpenStatus { state: OpenState; closesAt: string | null; opensAt: Date | null }
export function openStatusNow(now: Date = new Date()): OpenStatus {
  const ms = durationUntilClosingMs(now);
  if (ms != null) return { state: ms <= 60 * 60_000 ? "closingSoon" : "open", closesAt: getTodayHours(now)?.close ?? null, opensAt: null };
  return { state: "closed", closesAt: null, opensAt: getNextOpeningTime(now) };
}
export const openStatusEquals = (a: OpenStatus, b: OpenStatus) =>
  a.state === b.state && a.closesAt === b.closesAt && a.opensAt?.getTime() === b.opensAt?.getTime();

/** DateFormat.jm in `lang`: 12h with AM/PM for en; 24h for es/ca/fr; arabic uses 12h with ص/م */
function formatJm(h: number, m: number, lang: string): string {
  try {
    const d = new Date(Date.UTC(2000, 0, 1, h, m));
    return new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(d);
  } catch { return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }
}
function formatWeekday(d: Date, lang: string): string {
  try { return new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(d); }
  catch { return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(d); }
}
/** _OpenStatus.detail(languageCode) */
export function openStatusDetail(s: OpenStatus, lang: string, now: Date = new Date()): string {
  if (s.closesAt) {
    if (s.closesAt === "24:00") return translate("homeClosesAtMidnight", lang);
    const [hh, mm] = s.closesAt.split(":");
    return translate("homeClosesAt", lang).replace("{time}", formatJm(parseInt(hh, 10) || 0, parseInt(mm, 10) || 0, lang));
  }
  const next = s.opensAt;
  if (!next) return "";
  const spain = getSpainTime(now);
  const days = Math.trunc((Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()) - Date.UTC(spain.getUTCFullYear(), spain.getUTCMonth(), spain.getUTCDate())) / 86400_000);
  const tpl = days === 0 ? translate("homeOpensTodayAt", lang) : days === 1 ? translate("homeOpensTomorrowAt", lang)
    : translate("homeOpensOnAt", lang).replace("{day}", formatWeekday(next, lang));
  return tpl.replace("{time}", formatJm(next.getUTCHours(), next.getUTCMinutes(), lang));
}
void dartWeekday;
