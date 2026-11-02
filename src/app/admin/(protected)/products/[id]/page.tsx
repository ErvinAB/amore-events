import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminT } from "@/messages/admin";
import { defaultLocale, type LocalizedText } from "@/i18n/config";
import { uuidSchema } from "@/lib/validation/common";
import { FormMessage } from "@/components/ui/field";
import { ProductForm } from "../product-form";
import { loadCategoryOptions, loadCurrency } from "../data";

export const metadata = { title: adminT.products.edit };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: p }, categories, currency] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, name, short_description, description, price_minor, sale_price_minor, sku, stock, status, is_featured, is_new, product_categories(category_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    loadCategoryOptions(),
    loadCurrency(),
  ]);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/products" className="text-sm text-ink-muted hover:underline">
        ← {adminT.common.back}
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="heading-1">{adminT.products.edit}</h1>
        {p.status === "active" ? (
          <a href={`/${defaultLocale}/product/${p.slug}`} className="text-sm underline underline-offset-4" target="_blank" rel="noreferrer">
            {adminT.products.viewInStore}
          </a>
        ) : null}
      </div>
      {sp.created ? <FormMessage tone="success">{adminT.products.created}</FormMessage> : null}
      <ProductForm
        categories={categories}
        currency={currency}
        initial={{
          id: p.id,
          name: p.name as LocalizedText,
          short_description: p.short_description as LocalizedText | null,
          description: p.description as LocalizedText | null,
          slug: p.slug,
          price_minor: p.price_minor,
          sale_price_minor: p.sale_price_minor,
          sku: p.sku,
          stock: p.stock,
          status: p.status,
          is_featured: p.is_featured,
          is_new: p.is_new,
          category_ids: p.product_categories.map((c) => c.category_id),
        }}
      />
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
