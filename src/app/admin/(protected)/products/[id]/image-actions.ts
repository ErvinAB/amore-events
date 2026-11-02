"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/catalog/tags";
import { site } from "@/config/site";
import { type ActionState, readLocalized, uuidSchema } from "@/lib/validation/common";
import { adminT } from "@/messages/admin";

const registerSchema = z.object({
  productId: uuidSchema,
  path: z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});

/** Record an image the admin just uploaded to Storage (browser → Storage, RLS-checked). */
export async function registerImage(input: z.input<typeof registerSchema>): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`products/${parsed.data.productId}/`)) return { ok: false };
  const { productId, path, width, height } = parsed.data;

  const supabase = await createSupabaseServerClient();
  // The object must really exist in our bucket.
  const folder = `products/${productId}`;
  const file = path.slice(folder.length + 1);
  const { data: listed } = await supabase.storage.from(site.productImagesBucket).list(folder, { search: file, limit: 1 });
  if (!listed?.some((o) => o.name === file)) return { ok: false };

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, storage_path: path, width, height, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) {
    console.error("registerImage failed", error);
    await supabase.storage.from(site.productImagesBucket).remove([path]);
    return { ok: false };
  }
  updateTag(CATALOG_TAG);
  return { ok: true };
}

/** Persist a new order: the first id becomes the main image. */
export async function reorderImages(productId: string, orderedIds: string[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!uuidSchema.safeParse(productId).success || !orderedIds.every((id) => uuidSchema.safeParse(id).success)) {
    return { ok: false };
  }
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("product_images").update({ sort_order: index }).eq("id", id).eq("product_id", productId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) console.error("reorderImages failed", failed.error);
  updateTag(CATALOG_TAG);
  return { ok: !failed };
}

export async function deleteImage(imageId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!uuidSchema.safeParse(imageId).success) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase.from("product_images").delete().eq("id", imageId).select("storage_path").maybeSingle();
  if (error || !row) return { ok: false };
  const { error: rmErr } = await supabase.storage.from(site.productImagesBucket).remove([row.storage_path]);
  if (rmErr) console.error("deleteImage: storage object not removed", row.storage_path, rmErr);
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function saveImageAlt(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuidSchema.safeParse(form.get("image_id"));
  if (!id.success) return { message: adminT.common.genericError };
  const alt = readLocalized(form, "alt", { required: false, max: 200 });
  if (alt.error) return { errors: { alt: adminT.common.englishRequired }, message: adminT.common.fixErrors };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_images").update({ alt_text: alt.value }).eq("id", id.data);
  if (error) return { message: adminT.common.genericError };
  updateTag(CATALOG_TAG);
  return { ok: true, message: adminT.common.saved };
}
