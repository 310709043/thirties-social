// num.ts — defensive numeric coercion for currency-like values (wicks).
//
// Firestore fields can be missing, null, or (after a bad write) the string
// "undefined". Any of those flowing into arithmetic yields NaN, and a NaN
// balance written back permanently breaks a user's economy. Every read of a
// balance / amount MUST pass through safeNumber so an unexpected shape falls
// back to a sane default instead of poisoning the value.

/**
 * Coerce an unknown value to a finite number, or `fallback` (default 0) when it
 * is null/undefined/NaN/Infinity or an unparseable string. Never returns NaN.
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** A wick balance can never be negative or fractional. Clamp + floor. */
export function safeWicks(value: unknown): number {
  return Math.max(0, Math.floor(safeNumber(value, 0)));
}
