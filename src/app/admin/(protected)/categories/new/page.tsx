import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminT } from "@/messages/admin";
import { CategoryForm } from "../category-form";

export const metadata = { title: adminT.categories.new };

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/categories" className="text-sm text-ink-muted hover:underline">
        ← {adminT.common.back}
      </Link>
      <h1 className="heading-1">{adminT.categories.new}</h1>
      <CategoryForm initial={{ name: null, description: null, slug: "", sort_order: 0, is_active: true }} />
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
