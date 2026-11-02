"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Full-height menu on a native <dialog>: focus trap, Esc and backdrop for free. */
export function MobileMenu({
  links,
  labels,
  footer,
}: {
  links: { href: string; label: string }[];
  labels: { open: string; close: string; title: string };
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex min-h-touch min-w-touch items-center justify-center lg:hidden"
        aria-label={labels.open}
        aria-haspopup="dialog"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <dialog
        ref={ref}
        aria-label={labels.title}
        className="m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none bg-paper p-0 text-ink backdrop:bg-ink/30"
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end border-b border-line px-2">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="flex min-h-touch min-w-touch items-center justify-center"
              aria-label={labels.close}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label={labels.title} className="flex-1 overflow-y-auto px-6 py-6">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="flex min-h-touch items-center font-serif text-h4 aria-[current=page]:text-ribbon"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {footer ? <div className="border-t border-line px-4 py-4">{footer}</div> : null}
        </div>
      </dialog>
    </>
  );
}
