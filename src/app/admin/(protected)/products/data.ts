import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localized, type LocalizedText } from "@/i18n/config";

/** Category choices for the product form (admin sees inactive ones too). */
export async function loadCategoryOptions() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id, name, is_active").order("sort_order");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: localized(c.name as LocalizedText, "en") + (c.is_active ? "" : " (неактивна)"),
  }));
}

export async function loadCurrency() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_settings").select("currency_code").single();
  return data?.currency_code ?? "MKD";
}
