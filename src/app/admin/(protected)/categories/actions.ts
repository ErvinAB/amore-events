"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/catalog/tags";
import { type ActionState, type FieldErrors, readInt, readLocalized, slugSchema, uuidSchema } from "@/lib/validation/common";
import { adminT } from "@/messages/admin";

export async function saveCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const t = adminT;
  const errors: FieldErrors = {};

  const idRaw = form.get("id");
  const id = idRaw ? uuidSchema.safeParse(idRaw) : null;
  if (id && !id.success) return { message: t.common.genericError };

  const name = readLocalized(form, "name", { required: true, max: 120 });
  if (name.error) errors.name = t.common.englishRequired;
  const description = readLocalized(form, "description", { required: false, max: 2000 });
  if (description.error) errors.description = t.common.englishRequired;
  const slug = slugSchema.safeParse(form.get("slug"));
  if (!slug.success) errors.slug = t.categories.slugInvalid;
  const sortOrder = readInt(form.get("sort_order") || "0", { min: -9999, max: 9999 });
  if (sortOrder === null) errors.sort_order = t.common.fixErrors;

  if (Object.keys(errors).length || !slug.success || !name.value) return { errors, message: t.common.fixErrors };

  const row = {
    name: name.value,
    description: description.value,
    slug: slug.data,
    sort_order: sortOrder ?? 0,
    is_active: form.get("is_active") === "on",
  };

  const supabase = await createSupabaseServerClient();
  const result = id
    ? await supabase.from("categories").update(row).eq("id", id.data).select("id").maybeSingle()
    : await supabase.from("categories").insert(row).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") return { errors: { slug: t.categories.slugTaken }, message: t.common.fixErrors };
    console.error("saveCategory failed", result.error);
    return { message: t.common.genericError };
  }
  if (!result.data) return { message: t.common.genericError };

  updateTag(CATALOG_TAG);
  if (!id) redirect(`/admin/categories?created=1`);
  return { ok: true, message: t.common.saved };
}

export async function deleteCategory(form: FormData): Promise<void> {
  await requireAdmin();
  const id = uuidSchema.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) console.error("deleteCategory failed", error);
  updateTag(CATALOG_TAG);
  redirect("/admin/categories");
}
