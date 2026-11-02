"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/catalog/tags";
import { HARD_MAX } from "@/lib/personalization/validate";
import type { LocalizedText } from "@/i18n/config";
import { type ActionState, type FieldErrors, cleanText, readInt, readLocalized, uuidSchema } from "@/lib/validation/common";
import { adminT } from "@/messages/admin";

const typeSchema = z.enum(["text", "textarea", "select", "date"]);
const optionValuePattern = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function readOptions(form: FormData, errors: FieldErrors) {
  const indexes = new Set<string>();
  for (const key of form.keys()) {
    const m = /^options\.(\d{1,2})\./.exec(key);
    if (m) indexes.add(m[1]);
  }
  const options: { value: string; label: LocalizedText }[] = [];
  const seen = new Set<string>();
  for (const i of [...indexes].sort((a, b) => Number(a) - Number(b))) {
    const value = cleanText(form.get(`options.${i}.value`)).toLowerCase();
    const label = readLocalized(form, `options.${i}.label`, { required: false, max: 80 });
    if (!value && !label.value) continue; // empty row
    if (!optionValuePattern.test(value) || seen.has(value)) errors[`options.${i}.value`] = adminT.personalisation.optionValueInvalid;
    if (label.error || !label.value) errors[`options.${i}.label`] = adminT.common.englishRequired;
    seen.add(value);
    if (label.value) options.push({ value, label: label.value });
  }
  if (options.length === 0) errors.options = adminT.personalisation.optionsRequired;
  if (options.length > 50) errors.options = adminT.personalisation.optionsTooMany;
  return options;
}

export async function savePersonalizationField(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const t = adminT;
  const errors: FieldErrors = {};
  const productId = uuidSchema.safeParse(form.get("product_id"));
  const idRaw = form.get("id");
  const id = idRaw ? uuidSchema.safeParse(idRaw) : null;
  if (!productId.success || (id && !id.success)) return { message: t.common.genericError };

  const type = typeSchema.safeParse(form.get("type"));
  if (!type.success) return { message: t.common.genericError };
  const label = readLocalized(form, "label", { required: true, max: 80 });
  if (label.error) errors.label = t.common.englishRequired;
  const placeholder = readLocalized(form, "placeholder", { required: false, max: 120 });
  if (placeholder.error) errors.placeholder = t.common.englishRequired;
  const helpText = readLocalized(form, "help_text", { required: false, max: 300 });
  if (helpText.error) errors.help_text = t.common.englishRequired;

  let maxLength: number | null = null;
  const isText = type.data === "text" || type.data === "textarea";
  const maxRaw = cleanText(form.get("max_length"));
  if (isText && maxRaw) {
    maxLength = readInt(maxRaw, { min: 1, max: HARD_MAX });
    if (maxLength === null) errors.max_length = t.personalisation.maxLengthInvalid;
  }
  const options = type.data === "select" ? readOptions(form, errors) : null;

  if (Object.keys(errors).length || !label.value) return { errors, message: t.common.fixErrors };

  const row = {
    label: label.value,
    type: type.data,
    required: form.get("required") === "on",
    placeholder: type.data === "select" || type.data === "date" ? null : placeholder.value,
    help_text: helpText.value,
    max_length: isText ? maxLength : null,
    options,
  };

  const supabase = await createSupabaseServerClient();
  let error;
  if (id) {
    ({ error } = await supabase.from("personalization_fields").update(row).eq("id", id.data).eq("product_id", productId.data));
  } else {
    const { data: last } = await supabase
      .from("personalization_fields")
      .select("sort_order")
      .eq("product_id", productId.data)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase
      .from("personalization_fields")
      .insert({ ...row, product_id: productId.data, sort_order: (last?.sort_order ?? -1) + 1 }));
  }
  if (error) {
    console.error("savePersonalizationField failed", error);
    return { message: t.common.genericError };
  }
  updateTag(CATALOG_TAG);
  return { ok: true, message: t.common.saved };
}

export async function deletePersonalizationField(fieldId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!uuidSchema.safeParse(fieldId).success) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("personalization_fields").delete().eq("id", fieldId);
  updateTag(CATALOG_TAG);
  return { ok: !error };
}

/** Persist the full field order for a product (index = sort_order). */
export async function reorderPersonalizationFields(productId: string, orderedIds: string[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!uuidSchema.safeParse(productId).success || !orderedIds.every((i) => uuidSchema.safeParse(i).success)) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("personalization_fields").update({ sort_order: index }).eq("id", id).eq("product_id", productId),
    ),
  );
  updateTag(CATALOG_TAG);
  return { ok: results.every((r) => !r.error) };
}
