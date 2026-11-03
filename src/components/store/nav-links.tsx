"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Desktop header links; marks the page you're on. */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      {links.map((l) => {
        const current = pathname === l.href;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-touch items-center underline-offset-[6px] decoration-1 hover:underline ${current ? "underline decoration-ribbon" : ""}`}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
