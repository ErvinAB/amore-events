import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminT, fillAdmin } from "@/messages/admin";
import { ButtonLink } from "@/components/ui/button";

const LOW_STOCK = 3;

export const metadata = { title: adminT.dashboard.title };

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [active, drafts, low, categories] = await Promise.all([
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active").lte("stock", LOW_STOCK)),
    count(supabase.from("categories").select("id", { count: "exact", head: true })),
  ]);

  const t = adminT.dashboard;
  const stats = [
    { label: t.activeProducts, value: active, href: "/admin/products?status=active" },
    { label: t.draftProducts, value: drafts, href: "/admin/products?status=draft" },
    { label: fillAdmin(t.lowStock, { n: LOW_STOCK }), value: low, href: "/admin/products?stock=low" },
    { label: t.categories, value: categories, href: "/admin/categories" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-1">{t.title}</h1>
        <ButtonLink href="/admin/products/new">{t.addProduct}</ButtonLink>
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line lg:grid-cols-4">
        {stats.map((s) => (
          <a key={s.label} href={s.href} className="bg-paper p-4 hover:bg-tissue/60">
            <dt className="text-sm text-ink-muted">{s.label}</dt>
            <dd className="mt-1 font-serif text-h2">{s.value}</dd>
          </a>
        ))}
      </dl>
      <p className="text-ink-muted">{t.ordersComingSoon}</p>
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
