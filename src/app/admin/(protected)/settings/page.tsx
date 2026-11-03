import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminT } from "@/messages/admin";
import type { LocalizedText } from "@/i18n/config";
import { SettingsForm } from "./settings-form";

export const metadata = { title: adminT.settings.title };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase
    .from("store_settings")
    .select("currency_code, delivery_fee_minor, free_delivery_threshold_minor, delivery_estimate, support_phone, support_email, instagram_url, facebook_url, tiktok_url")
    .single();
  if (!s) throw new Error("store settings missing");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading-1">{adminT.settings.title}</h1>
      <SettingsForm initial={{ ...s, delivery_estimate: s.delivery_estimate as LocalizedText | null }} />
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
