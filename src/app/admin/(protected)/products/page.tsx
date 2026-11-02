import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminMoneyLocale, adminT } from "@/messages/admin";
import { ButtonLink } from "@/components/ui/button";
import { localized, type LocalizedText } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { productImageUrl } from "@/lib/catalog/images";
import { loadCurrency } from "./data";

export const metadata = { title: adminT.products.title };

const LOW_STOCK = 3;
const filters = ["all", "active", "draft", "archived", "low"] as const;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp.stock === "low" ? "low" : filters.find((f) => f === sp.status) ?? "all";
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("id, slug, name, price_minor, sale_price_minor, stock, status, product_images(storage_path, sort_order)")
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images" })
    .limit(1, { referencedTable: "product_images" });
  if (filter === "low") query = query.eq("status", "active").lte("stock", LOW_STOCK);
  else if (filter !== "all") query = query.eq("status", filter);
  const [{ data: products }, currency] = await Promise.all([query, loadCurrency()]);
  const t = adminT.products;
  const labels = { all: t.filters.all, active: t.filters.active, draft: t.filters.draft, archived: t.filters.archived, low: t.filters.lowStock };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-1">{t.title}</h1>
        <ButtonLink href="/admin/products/new">{t.new}</ButtonLink>
      </div>
      <nav aria-label={t.title} className="-mx-1 flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/products" : f === "low" ? "/admin/products?stock=low" : `/admin/products?status=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={
              "flex min-h-10 items-center whitespace-nowrap rounded-pill border px-4 text-sm " +
              (filter === f ? "border-ribbon bg-ribbon-tint text-ribbon" : "border-line bg-paper hover:border-line-strong")
            }
          >
            {labels[f]}
          </Link>
        ))}
      </nav>
      {!products?.length ? (
        <p className="text-ink-muted">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-control border border-line bg-paper">
          {products.map((p) => {
            const img = p.product_images[0];
            return (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-tissue/50">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-image bg-tissue">
                    {img ? (
                      <Image src={productImageUrl(img.storage_path)} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-center text-[10px] leading-tight text-ink-muted">
                        {t.noImage}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{localized(p.name as LocalizedText, "en")}</span>
                    <span className="block text-sm text-ink-muted">
                      {formatMoney(p.sale_price_minor ?? p.price_minor, { currency, locale: adminMoneyLocale })} · {t.stock}:{" "}
                      <span className={p.stock <= LOW_STOCK ? "font-medium text-warning" : ""}>{p.stock}</span>
                    </span>
                  </span>
                  <span
                    className={
                      "shrink-0 rounded-pill px-2.5 py-0.5 text-xs " +
                      (p.status === "active" ? "bg-success-tint text-success" : "bg-tissue text-ink-muted")
                    }
                  >
                    {t.statuses[p.status]}
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
