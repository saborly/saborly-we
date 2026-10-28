// Port of timeago (Dart) `format(date)` for the default English locale
export function timeagoFormat(date: Date, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - date.getTime();
  const prefix = "", suffix = " ago";
  const seconds = Math.abs(elapsedMs) / 1000;
  const minutes = seconds / 60, hours = minutes / 60, days = hours / 24, years = days / 365;
  const r = (n: number) => Math.round(n);
  let result: string;
  if (seconds < 45) result = "a moment";
  else if (seconds < 90) result = "a minute";
  else if (minutes < 45) result = `${r(minutes)} minutes`;
  else if (minutes < 90) result = "about an hour";
  else if (hours < 24) result = `${r(hours)} hours`;
  else if (hours < 48) result = "a day";
  else if (days < 30) result = `${r(days)} days`;
  else if (days < 60) result = "about a month";
  else if (days < 365) result = `${r(days / 30)} months`;
  else if (years < 2) result = "about a year";
  else result = `${r(years)} years`;
  return `${prefix}${result}${suffix}`.trim();
}
