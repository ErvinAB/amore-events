"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart/store";

export function BagLink({ href, label, labelWithCount }: { href: string; label: string; labelWithCount: string }) {
  const count = useCartCount();
  return (
    <Link
      href={href}
      className="relative flex min-h-touch min-w-touch items-center justify-center gap-2 px-2 text-sm"
      aria-label={count ? labelWithCount.replace("{count}", String(count)) : label}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M5 8h14l-1.2 12H6.2L5 8Z" strokeLinejoin="round" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
      {count ? (
        <span className="absolute top-1.5 right-0.5 flex min-w-5 items-center justify-center rounded-pill bg-ribbon px-1 text-[11px] leading-5 text-on-ribbon sm:static">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
