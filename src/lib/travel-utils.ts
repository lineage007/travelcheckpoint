export function isoDateFromDays(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().split('T')[0];
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function safeIsoDate(value: string | null | undefined, fallbackDaysFromNow = 7) {
  return value && isIsoDate(value) ? value : isoDateFromDays(fallbackDaysFromNow);
}

export function addDaysToIsoDate(date: string, days: number) {
  const base = isIsoDate(date) ? new Date(`${date}T00:00:00.000Z`) : new Date(`${isoDateFromDays(7)}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split('T')[0];
}

export function normalizeAirportCode(value: string | null | undefined, fallback = 'DXB') {
  const code = (value || fallback).toUpperCase().trim();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function clampInt(value: string | null | undefined, fallback: number, min: number, max: number) {
  const parsed = parseInt(value || String(fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
