import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminT } from "@/messages/admin";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { localized, type LocalizedText } from "@/i18n/config";

export const metadata = { title: adminT.categories.title };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const { created } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order, is_active, product_categories(count)")
    .order("sort_order")
    .order("created_at");
  const t = adminT;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-1">{t.categories.title}</h1>
        <ButtonLink href="/admin/categories/new">{t.categories.new}</ButtonLink>
      </div>
      {created ? <FormMessage tone="success">{t.categories.created}</FormMessage> : null}
      {!categories?.length ? (
        <p className="text-ink-muted">{t.categories.empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-control border border-line bg-paper">
          {categories.map((c) => {
            const count = (c.product_categories as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/categories/${c.id}`}
                  className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-tissue/50"
                >
                  <span>
                    <span className="block font-medium">{localized(c.name as LocalizedText, "en")}</span>
                    <span className="block text-sm text-ink-muted">/{c.slug}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="text-ink-muted">
                      {t.categories.products}: {count}
                    </span>
                    <span className={c.is_active ? "text-success" : "text-ink-muted"}>
                      {c.is_active ? t.common.active : t.common.inactive}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
