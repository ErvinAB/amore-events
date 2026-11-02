import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminT } from "@/messages/admin";
import { uuidSchema } from "@/lib/validation/common";
import type { LocalizedText } from "@/i18n/config";
import { CategoryForm } from "../category-form";
import { deleteCategory } from "../actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

export const metadata = { title: adminT.categories.edit };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/categories" className="text-sm text-ink-muted hover:underline">
        ← {adminT.common.back}
      </Link>
      <h1 className="heading-1">{adminT.categories.edit}</h1>
      <CategoryForm
        initial={{
          id: c.id,
          name: c.name as LocalizedText,
          description: c.description as LocalizedText | null,
          slug: c.slug,
          sort_order: c.sort_order,
          is_active: c.is_active,
        }}
      />
      <form action={deleteCategory} className="max-w-2xl border-t border-line pt-6">
        <input type="hidden" name="id" value={c.id} />
        <ConfirmSubmit message={adminT.categories.deleteConfirm} variant="danger" size="sm">
          {adminT.common.delete}
        </ConfirmSubmit>
      </form>
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
