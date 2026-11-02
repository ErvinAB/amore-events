import { z } from "zod";
import { locales, type LocalizedText } from "@/i18n/config";
import { SLUG_PATTERN } from "@/lib/slug";

/** Field-level errors keyed by form field name. */
export type FieldErrors = Record<string, string>;

export type ActionState<T = undefined> = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  data?: T;
};

/** Remove control characters (keep newlines/tabs) and trim. */
export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";
}

/**
 * Read `${prefix}.en|mk|sq` from FormData into a LocalizedText.
 * Blank translations are dropped (they fall back to English).
 */
export function readLocalized(
  form: FormData,
  prefix: string,
  { required, max }: { required: boolean; max: number },
): { value: LocalizedText | null; error?: "required" | "tooLong" } {
  const out: Record<string, string> = {};
  for (const l of locales) {
    const v = cleanText(form.get(`${prefix}.${l}`));
    if (v.length > max) return { value: null, error: "tooLong" };
    if (v) out[l] = v;
  }
  if (!out.en) {
    if (required || Object.keys(out).length > 0) return { value: null, error: "required" };
    return { value: null };
  }
  return { value: out as LocalizedText };
}

export const slugSchema = z.string().trim().toLowerCase().min(1).max(100).regex(SLUG_PATTERN);

/**
 * Owner-entered money → integer minor units. Accepts "1200", "1200.5",
 * "1200,50". Rejects thousands separators and negative values.
 */
export function parseMoneyInput(raw: unknown, fractionDigits = 2): number | null {
  const s = typeof raw === "string" ? raw.trim().replace(/\s/g, "") : "";
  if (!s) return null;
  const m = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return NaN;
  const whole = Number(m[1]);
  const frac = Number((m[2] ?? "").padEnd(fractionDigits, "0").slice(0, fractionDigits) || 0);
  return whole * 10 ** fractionDigits + frac;
}

/** Minor units → plain owner-facing input value ("1200" or "1200.50"). */
export function moneyInputValue(minor: number | null | undefined, fractionDigits = 2): string {
  if (minor == null) return "";
  const whole = Math.trunc(minor / 10 ** fractionDigits);
  const frac = minor % 10 ** fractionDigits;
  return frac ? `${whole}.${String(frac).padStart(fractionDigits, "0")}` : String(whole);
}

export function readInt(raw: unknown, { min, max }: { min: number; max: number }): number | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!/^-?\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

export const uuidSchema = z.uuid();
