// Port of lib/core/utils/time_utils.dart. "Spain time" is represented exactly as in Dart: a Date whose
// UTC fields carry the Spain wall-clock values (so only getUTC* accessors are meaningful on it).
export const OPERATING_HOURS: Record<number, { open: string; close: string }> = {
  1: { open: "12:00", close: "23:00" }, // Dart DateTime.monday == 1 ... sunday == 7
  2: { open: "12:00", close: "23:00" },
  3: { open: "12:00", close: "23:00" },
  4: { open: "12:00", close: "23:00" },
  5: { open: "12:00", close: "24:00" },
  6: { open: "12:00", close: "24:00" },
  7: { open: "12:00", close: "23:00" },
};

/** Dart DateTime.weekday of a UTC-flagged date (Mon=1..Sun=7) */
export const dartWeekday = (d: Date) => (d.getUTCDay() === 0 ? 7 : d.getUTCDay());

function lastSundayOfMonthUtc(year: number, month: number): Date {
  // month is 1-based; Dart DateTime.utc(year, month + 1, 0) == last day of `month`
  const lastDay = new Date(Date.UTC(year, month, 0));
  const wd = dartWeekday(lastDay);
  const sub = wd === 7 ? 0 : wd;
  return new Date(Date.UTC(year, month - 1, lastDay.getUTCDate() - sub, 1, 0, 0));
}
function isDst(nowUtc: Date): boolean {
  const y = nowUtc.getUTCFullYear();
  return nowUtc > lastSundayOfMonthUtc(y, 3) && nowUtc < lastSundayOfMonthUtc(y, 10);
}
export function getSpainTime(now: Date = new Date()): Date {
  return new Date(now.getTime() + (isDst(now) ? 2 : 1) * 3600_000);
}
const parseTime = (t: string) => { const [h, m] = t.split(":"); return { hour: parseInt(h, 10), minute: parseInt(m, 10) }; };

export function isRestaurantOpen(now: Date = new Date()): boolean {
  const spain = getSpainTime(now);
  const hours = OPERATING_HOURS[dartWeekday(spain)];
  if (!hours) return false;
  const o = parseTime(hours.open), c = parseTime(hours.close);
  const cur = spain.getUTCHours() * 60 + spain.getUTCMinutes();
  const openM = o.hour * 60 + o.minute, closeM = c.hour * 60 + c.minute;
  if (closeM === 1440) return cur >= openM;
  return cur >= openM && cur < closeM;
}

export function getNextOpeningTime(now: Date = new Date()): Date | null {
  const spain = getSpainTime(now);
  const today = OPERATING_HOURS[dartWeekday(spain)];
  if (today) {
    const o = parseTime(today.open);
    const opening = new Date(Date.UTC(spain.getUTCFullYear(), spain.getUTCMonth(), spain.getUTCDate(), o.hour, o.minute));
    if (spain < opening) return opening;
  }
  for (let i = 1; i <= 7; i++) {
    const next = new Date(spain.getTime() + i * 86400_000);
    const h = OPERATING_HOURS[dartWeekday(next)];
    if (h) {
      const o = parseTime(h.open);
      return new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), o.hour, o.minute));
    }
  }
  return null;
}

export function getTodayHours(now: Date = new Date()) {
  return OPERATING_HOURS[dartWeekday(getSpainTime(now))] ?? null;
}

export function durationUntilClosingMs(now: Date = new Date()): number | null {
  if (!isRestaurantOpen(now)) return null;
  const spain = getSpainTime(now);
  const hours = getTodayHours(now);
  if (!hours) return null;
  const c = parseTime(hours.close);
  const closing = Date.UTC(spain.getUTCFullYear(), spain.getUTCMonth(), spain.getUTCDate()) + c.hour * 3600_000 + c.minute * 60_000;
  return closing - spain.getTime();
}

export function getTimeUntilClosing(now: Date = new Date()): string | null {
  const ms = durationUntilClosingMs(now);
  if (ms == null) return null;
  const inHours = Math.trunc(ms / 3600_000), inMinutes = Math.trunc(ms / 60_000);
  return inHours > 0 ? `${inHours}h ${inMinutes % 60}m` : `${inMinutes}m`;
}

function formatTime(t: string): string {
  const { hour, minute } = parseTime(t);
  const mm = String(minute).padStart(2, "0");
  return hour >= 12 ? `${hour === 12 ? 12 : hour - 12}:${mm} PM` : `${hour}:${mm} AM`;
}
export function getClosingTimeText(now: Date = new Date()): string | null {
  const h = getTodayHours(now);
  if (!h) return null;
  return h.close === "24:00" ? "12:00 AM" : formatTime(h.close);
}

// ---- intl DateFormat patterns used by CheckoutProvider (en_US) ----
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** DateFormat('h:mm a') on a UTC-flagged Spain date */
export function formatHmma(d: Date): string {
  const h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}
/** DateFormat("EEEE 'at' h:mm a") */
export const formatEeeeAtHmma = (d: Date) => `${DAYS[d.getUTCDay()]} at ${formatHmma(d)}`;
