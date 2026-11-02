import type { LocalizedText } from "@/i18n/config";

/**
 * Data-driven personalisation. One validator used on the product page
 * (instant feedback) and on the server at checkout (authoritative, against
 * fields re-read from the database). Never trust client-side results.
 */
export type FieldType = "text" | "textarea" | "select" | "date";
export type SelectOption = { value: string; label: LocalizedText };

export type PersonalizationField = {
  id: string;
  label: LocalizedText;
  type: FieldType;
  required: boolean;
  placeholder: LocalizedText | null;
  help_text: LocalizedText | null;
  max_length: number | null;
  options: SelectOption[] | null;
  sort_order: number;
};

export type PersonalizationErrorCode = "required" | "tooLong" | "invalidOption" | "invalidDate";

export type PersonalizationResult =
  | { ok: true; values: Record<string, string> }
  | { ok: false; errors: Record<string, PersonalizationErrorCode>; unknownFields: boolean };

/** Defaults when the owner leaves max length empty. */
export const DEFAULT_MAX = { text: 60, textarea: 300 } as const;
export const HARD_MAX = 500;

export function maxLengthFor(field: Pick<PersonalizationField, "type" | "max_length">): number | null {
  if (field.type !== "text" && field.type !== "textarea") return null;
  return Math.min(field.max_length ?? DEFAULT_MAX[field.type], HARD_MAX);
}

/** Length as customers see it (code points, so emoji/Cyrillic count as one). */
export function charLength(s: string): number {
  return Array.from(s).length;
}

/** Normalise a raw value: strip control chars; single-line fields lose newlines. */
export function normalizeValue(type: FieldType, raw: unknown): string {
  if (typeof raw !== "string") return "";
  let v = raw.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  v = type === "textarea" ? v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n") : v.replace(/[\r\n\t]+/g, " ");
  return v.trim();
}

function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  const year = d.getUTCFullYear();
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && year >= 1900 && year <= 2100;
}

export function validateField(field: PersonalizationField, raw: unknown): { value: string } | { error: PersonalizationErrorCode } {
  const value = normalizeValue(field.type, raw);
  if (!value) return field.required ? { error: "required" } : { value: "" };
  switch (field.type) {
    case "text":
    case "textarea":
      return charLength(value) > (maxLengthFor(field) ?? HARD_MAX) ? { error: "tooLong" } : { value };
    case "select":
      return field.options?.some((o) => o.value === value) ? { value } : { error: "invalidOption" };
    case "date":
      return isValidIsoDate(value) ? { value } : { error: "invalidDate" };
  }
}

/**
 * Validate a full set of values against a product's fields.
 * Unknown field ids are rejected (they mean stale or tampered input).
 * Empty optional values are omitted from the result.
 */
export function validatePersonalization(fields: PersonalizationField[], input: Record<string, unknown>): PersonalizationResult {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const unknownFields = Object.keys(input).some((k) => !byId.has(k));
  const errors: Record<string, PersonalizationErrorCode> = {};
  const values: Record<string, string> = {};
  for (const field of fields) {
    const r = validateField(field, input[field.id]);
    if ("error" in r) errors[field.id] = r.error;
    else if (r.value) values[field.id] = r.value;
  }
  if (unknownFields || Object.keys(errors).length) return { ok: false, errors, unknownFields };
  return { ok: true, values };
}
