const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses YYYY-MM-DD as a UTC date so formatting never shifts by time zone. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** "12–15 Oct 2025", "28 Sept – 2 Oct 2025", "30 Dec 2025 – 2 Jan 2026" or a single date. */
export function formatDateRange(start: string | null, end: string | null): string {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a && !b) return "";
  if (a && !b) return full.format(a);
  if (!a && b) return full.format(b);
  if (!a || !b) return "";
  if (a.getTime() === b.getTime()) return full.format(a);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  if (sameMonth) return `${day.format(a)}–${full.format(b)}`;
  if (sameYear) return `${dayMonth.format(a)} – ${full.format(b)}`;
  return `${full.format(a)} – ${full.format(b)}`;
}

export function formatDate(value: string | null): string {
  const date = parseIsoDate(value);
  return date ? full.format(date) : "";
}

export function formatMonthYear(value: string | null): string {
  const date = parseIsoDate(value);
  return date ? monthYear.format(date) : "";
}

/** Whole days between two ISO dates, inclusive. Returns null when unknown. */
export function tripLengthInDays(start: string | null, end: string | null): number | null {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a || !b || b < a) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}
