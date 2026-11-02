"use client";

import { usePathname } from "next/navigation";
import { localeCookie, localeMeta, locales, type Locale } from "@/i18n/config";

/** Links to the same page in each language; remembers the choice. */
export function LanguageSwitcher({ current, label, className = "" }: { current: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${current}`;
  const rest = pathname.replace(/^\/[^/]+/, "");
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-1">
        {locales.map((l) => (
          <li key={l}>
            <a
              href={`/${l}${rest}`}
              hrefLang={localeMeta[l].htmlLang}
              lang={localeMeta[l].htmlLang}
              aria-current={l === current ? "true" : undefined}
              onClick={() => {
                document.cookie = `${localeCookie}=${l}; path=/; max-age=31536000; samesite=lax`;
              }}
              className={
                "flex min-h-10 min-w-10 items-center justify-center rounded-control px-2 text-sm uppercase " +
                (l === current ? "text-ink underline underline-offset-4" : "text-ink-muted hover:text-ink")
              }
            >
              <span aria-hidden="true">{l}</span>
              <span className="sr-only">{localeMeta[l].label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
