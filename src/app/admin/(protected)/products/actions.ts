"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/catalog/tags";
import {
  type ActionState,
  type FieldErrors,
  cleanText,
  parseMoneyInput,
  readInt,
  readLocalized,
  slugSchema,
  uuidSchema,
} from "@/lib/validation/common";
import { adminT } from "@/messages/admin";

const statusSchema = z.enum(["draft", "active", "archived"]);
const skuPattern = /^[A-Za-z0-9._-]{1,64}$/;

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const t = adminT;
  const errors: FieldErrors = {};

  const idRaw = form.get("id");
  const id = idRaw ? uuidSchema.safeParse(idRaw) : null;
  if (id && !id.success) return { message: t.common.genericError };

  const name = readLocalized(form, "name", { required: true, max: 160 });
  if (name.error) errors.name = t.common.englishRequired;
  const shortDescription = readLocalized(form, "short_description", { required: false, max: 300 });
  if (shortDescription.error) errors.short_description = t.common.englishRequired;
  const description = readLocalized(form, "description", { required: false, max: 5000 });
  if (description.error) errors.description = t.common.englishRequired;

  const slug = slugSchema.safeParse(form.get("slug"));
  if (!slug.success) errors.slug = t.products.slugInvalid;

  const price = parseMoneyInput(form.get("price"));
  if (price === null || Number.isNaN(price)) errors.price = t.products.priceInvalid;
  const sale = parseMoneyInput(form.get("sale_price"));
  if (Number.isNaN(sale)) errors.sale_price = t.products.priceInvalid;
  else if (sale !== null && price !== null && !Number.isNaN(price) && sale >= price) errors.sale_price = t.products.salePriceHelp;

  const skuRaw = cleanText(form.get("sku"));
  if (skuRaw && !skuPattern.test(skuRaw)) errors.sku = t.products.skuInvalid;

  const stock = readInt(form.get("stock"), { min: 0, max: 1_000_000 });
  if (stock === null) errors.stock = t.products.stockInvalid;

  const status = statusSchema.safeParse(form.get("status"));
  if (!status.success) errors.status = t.common.fixErrors;

  const categoryIds = form.getAll("category_ids").map(String);
  if (!categoryIds.every((c) => uuidSchema.safeParse(c).success)) return { message: t.common.genericError };

  if (Object.keys(errors).length || !name.value || !slug.success || !status.success || price === null || stock === null) {
    return { errors, message: t.common.fixErrors };
  }

  const row = {
    name: name.value,
    short_description: shortDescription.value,
    description: description.value,
    slug: slug.data,
    price_minor: price,
    sale_price_minor: sale,
    sku: skuRaw || null,
    stock,
    status: status.data,
    is_featured: form.get("is_featured") === "on",
    is_new: form.get("is_new") === "on",
  };

  const supabase = await createSupabaseServerClient();
  const result = id
    ? await supabase.from("products").update(row).eq("id", id.data).select("id").maybeSingle()
    : await supabase.from("products").insert(row).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") {
      const field = result.error.message.includes("sku") ? "sku" : "slug";
      return { errors: { [field]: field === "sku" ? t.products.skuTaken : t.products.slugTaken }, message: t.common.fixErrors };
    }
    console.error("saveProduct failed", result.error);
    return { message: t.common.genericError };
  }
  if (!result.data) return { message: t.common.genericError };
  const productId = result.data.id;

  // Replace category links with the submitted set.
  const { error: delErr } = await supabase.from("product_categories").delete().eq("product_id", productId);
  const { error: insErr } = categoryIds.length
    ? await supabase.from("product_categories").insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })))
    : { error: null };
  if (delErr || insErr) {
    console.error("saveProduct categories failed", delErr ?? insErr);
    return { message: t.products.categoriesFailed };
  }

  updateTag(CATALOG_TAG);
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return { ok: true, message: t.common.saved };
}
