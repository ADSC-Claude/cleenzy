/** Philippine formatting helpers — peso amounts, local dates, phone numbers. */

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₱1,250.00 */
export function peso(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return PESO.format(Number.isFinite(n) ? n : 0);
}

/** 1,250.00 — for receipts, where the glyph is printed separately. */
export function pesoPlain(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

const MANILA = "Asia/Manila";

/** 22 Aug 2026 */
export function phDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric", month: "short", year: "numeric", timeZone: MANILA,
  }).format(d);
}

/** 22 Aug 2026, 3:45 PM */
export function phDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: MANILA,
  }).format(d);
}

/** Fri, 22 Aug — compact label for schedule chips. */
export function phDayLabel(value: string | Date): string {
  const d = typeof value === "string" ? new Date(`${value}T00:00:00+08:00`) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short", day: "numeric", month: "short", timeZone: MANILA,
  }).format(d);
}

/** Today's date in Manila as YYYY-MM-DD, regardless of server timezone. */
export function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Adds days to a YYYY-MM-DD string without tripping over timezones. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 0917 555 1234 */
export function phPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
  if (local.length === 11) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return raw;
}

/** Accepts 09XXXXXXXXX, +639XXXXXXXXX or 639XXXXXXXXX. */
export function isValidPhPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63")) return digits.length === 12 && digits[2] === "9";
  return digits.length === 11 && digits.startsWith("09");
}

/** Normalises any accepted form to 09XXXXXXXXX for storage. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63")) return `0${digits.slice(2)}`;
  return digits;
}
