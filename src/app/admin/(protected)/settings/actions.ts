"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/lib/catalog/tags";
import { type ActionState, type FieldErrors, cleanText, parseMoneyInput, readLocalized } from "@/lib/validation/common";
import { adminT } from "@/messages/admin";

const httpsUrl = (v: string) => /^https:\/\/[^\s]+$/.test(v) && v.length <= 300;

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const t = adminT.settings;
  const errors: FieldErrors = {};

  const fee = parseMoneyInput(form.get("delivery_fee"));
  if (fee === null || Number.isNaN(fee)) errors.delivery_fee = t.amountInvalid;
  const threshold = parseMoneyInput(form.get("free_threshold"));
  if (Number.isNaN(threshold) || threshold === 0) errors.free_threshold = t.amountInvalid;
  const estimate = readLocalized(form, "delivery_estimate", { required: false, max: 200 });
  if (estimate.error) errors.delivery_estimate = adminT.common.englishRequired;

  const phone = cleanText(form.get("support_phone")) || null;
  if (phone && phone.length > 40) errors.support_phone = adminT.common.fixErrors;
  const email = cleanText(form.get("support_email")) || null;
  if (email && !z.email().safeParse(email).success) errors.support_email = t.emailInvalid;
  const urls: Record<string, string | null> = {};
  for (const k of ["instagram_url", "facebook_url", "tiktok_url"]) {
    const v = cleanText(form.get(k)) || null;
    if (v && !httpsUrl(v)) errors[k] = t.urlInvalid;
    urls[k] = v;
  }

  if (Object.keys(errors).length || fee === null || Number.isNaN(fee)) return { errors, message: adminT.common.fixErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_settings")
    .update({
      delivery_fee_minor: fee,
      free_delivery_threshold_minor: threshold,
      delivery_estimate: estimate.value,
      support_phone: phone,
      support_email: email,
      instagram_url: urls.instagram_url,
      facebook_url: urls.facebook_url,
      tiktok_url: urls.tiktok_url,
    })
    .eq("id", true);
  if (error) {
    console.error("saveSettings failed", error);
    return { message: adminT.common.genericError };
  }
  updateTag(CATALOG_TAG);
  return { ok: true, message: adminT.common.saved };
}
