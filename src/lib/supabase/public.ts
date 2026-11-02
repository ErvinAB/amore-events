import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { noStoreFetch } from "./no-store-fetch";

/**
 * Cookie-less anonymous client for storefront catalogue reads.
 * Safe inside `'use cache'` because it never touches request data.
 * RLS limits it to active products and categories.
 */
export function createSupabasePublicClient() {
  const env = publicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noStoreFetch },
  });
}
