/**
 * Phone numbers → E.164 (+3897xxxxxxx). Default country is North Macedonia
 * (+389) for national formats like "070 123 456". International numbers
 * with + or 00 are accepted as-is.
 */
export const DEFAULT_COUNTRY_CODE = "389";

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 40) return null;
  if (/[^\d\s+().\-/]/.test(trimmed)) return null; // letters etc.
  let digits = trimmed.replace(/[\s().\-/]/g, "");
  if (digits.indexOf("+") > 0 || (digits.match(/\+/g) ?? []).length > 1) return null;

  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === DEFAULT_COUNTRY_CODE.length + 8) {
      digits = `+${digits}`;
    } else if (digits.startsWith("0")) {
      digits = `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
    } else if (digits.length === 8) {
      digits = `+${DEFAULT_COUNTRY_CODE}${digits}`;
    } else {
      return null;
    }
  }
  // Macedonian numbers have exactly 8 national digits.
  if (digits.startsWith(`+${DEFAULT_COUNTRY_CODE}`) && digits.length !== 1 + DEFAULT_COUNTRY_CODE.length + 8) return null;
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
