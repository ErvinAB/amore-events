import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminT, fillAdmin } from "@/messages/admin";
import { site } from "@/config/site";
import { defaultLocale } from "@/i18n/config";
import { signOut } from "../actions";
import { AdminNav } from "./admin-nav";

const navItems = [
  { href: "/admin", label: adminT.nav.dashboard },
  { href: "/admin/products", label: adminT.nav.products },
  { href: "/admin/categories", label: adminT.nav.categories },
  { href: "/admin/orders", label: adminT.nav.orders },
  { href: "/admin/settings", label: adminT.nav.settings },
];

export default function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-wide flex-col lg:flex-row">
      <aside className="gutter border-b border-line bg-paper py-4 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-8">
        <div className="mb-3 flex items-baseline justify-between gap-3 lg:mb-8 lg:block">
          <p className="font-serif text-lg">{site.name}</p>
          <a href={`/${defaultLocale}`} className="text-sm text-ink-muted underline-offset-4 hover:underline lg:mt-1 lg:block">
            {adminT.nav.viewStore}
          </a>
        </div>
        <AdminNav items={navItems} label={adminT.nav.mainNav} />
        <Suspense>
          <SignedInAs />
        </Suspense>
      </aside>
      <div className="gutter flex-1 py-6 lg:py-10">
        <Suspense fallback={<p className="text-ink-muted">…</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </div>
    </div>
  );
}

/** Renders children only for a verified admin. Pages also call requireAdmin(). */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <main id="main">{children}</main>;
}

async function SignedInAs() {
  const admin = await requireAdmin();
  return (
    <div className="mt-4 hidden border-t border-line pt-4 text-sm text-ink-muted lg:block">
      <p className="truncate">{fillAdmin(adminT.nav.signedInAs, { email: admin.email ?? "" })}</p>
      <form action={signOut} className="mt-2">
        <button type="submit" className="text-ink underline underline-offset-4">
          {adminT.nav.signOut}
        </button>
      </form>
    </div>
  );
}
