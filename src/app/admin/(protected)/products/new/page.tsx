import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminT } from "@/messages/admin";
import { ProductForm } from "../product-form";
import { loadCategoryOptions, loadCurrency } from "../data";

export const metadata = { title: adminT.products.new };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, currency] = await Promise.all([loadCategoryOptions(), loadCurrency()]);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/products" className="text-sm text-ink-muted hover:underline">
        ← {adminT.common.back}
      </Link>
      <h1 className="heading-1">{adminT.products.new}</h1>
      <ProductForm
        categories={categories}
        currency={currency}
        initial={{
          name: null,
          short_description: null,
          description: null,
          slug: "",
          price_minor: null,
          sale_price_minor: null,
          sku: null,
          stock: 0,
          status: "draft",
          is_featured: false,
          is_new: false,
          category_ids: [],
        }}
      />
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
