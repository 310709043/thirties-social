/**
 * Product-day key with a local 03:00 boundary.
 *
 * Quotas are described to users as resetting at 03:00. Shifting the local
 * clock back three hours before taking the calendar date makes 02:59 belong to
 * the previous product day without depending on UTC or a fixed timezone.
 */
export function localProductDayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - 3);
  return localDateKey(shifted);
}

/** Monday-based product week, also rolling over at local 03:00. */
export function localProductWeekKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - 3);
  const weekday = shifted.getDay();
  const daysSinceMonday = (weekday + 6) % 7;
  shifted.setDate(shifted.getDate() - daysSinceMonday);
  return localDateKey(shifted);
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
