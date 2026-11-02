"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto lg:mx-0 lg:flex-col">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex min-h-10 items-center whitespace-nowrap rounded-control px-3 text-sm " +
              (active ? "bg-ribbon-tint font-medium text-ribbon" : "text-ink hover:bg-tissue")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
