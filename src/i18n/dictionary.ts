import "server-only";
import { defaultLocale, type Locale } from "./config";
import en from "@/messages/en.json";

export type Dictionary = typeof en;

const loaders: Record<Locale, () => Promise<unknown>> = {
  en: async () => en,
  mk: () => import("@/messages/mk.json").then((m) => m.default),
  sq: () => import("@/messages/sq.json").then((m) => m.default),
};

/** Deep-merge `override` onto `base`; blank strings do not override. */
function merge<T>(base: T, override: unknown): T {
  if (typeof base !== "object" || base === null || typeof override !== "object" || override === null) {
    return typeof override === "string" && override.trim() ? (override as T) : base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(out)) {
    out[key] = merge(out[key], (override as Record<string, unknown>)[key]);
  }
  return out as T;
}

/** Storefront strings for a locale; missing keys fall back to English. */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === defaultLocale) return en;
  return merge(en, await loaders[locale]());
}

/** Tiny `{name}` interpolation. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}
