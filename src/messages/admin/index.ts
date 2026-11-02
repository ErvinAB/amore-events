import { adminMk } from "./mk";

/** Admin UI language is independent of the storefront default locale. */
export const adminT = adminMk;
export const adminHtmlLang = "mk";
export const adminIntlLocale = "mk-MK";
/** Locale used for money formatting in the admin. */
export const adminMoneyLocale = "mk" as const;

export function fillAdmin(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}
