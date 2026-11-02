import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CATALOG_TAG } from "./tags";

export type StoreSettings = {
  store_name: string;
  currency_code: string;
  delivery_fee_minor: number;
  free_delivery_threshold_minor: number | null;
  delivery_estimate: Record<string, string> | null;
  support_phone: string | null;
  support_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
};

/** Public store settings (cached; expired with the catalogue tag). */
export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const { data, error } = await createSupabasePublicClient()
    .from("store_settings")
    .select(
      "store_name, currency_code, delivery_fee_minor, free_delivery_threshold_minor, delivery_estimate, support_phone, support_email, instagram_url, facebook_url, tiktok_url",
    )
    .single();
  if (error || !data) throw new Error("Store settings are missing.");
  return data as StoreSettings;
}
