import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * SERVER ONLY. Secret-key client that BYPASSES RLS.
 * The only intended caller is the checkout boundary (V0.2) invoking
 * place_order(). Do not use it for admin CRUD — those go through the
 * signed-in user's client so RLS applies.
 */
export function createSupabaseSecretClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.startsWith("NEXT_PUBLIC")) {
    throw new Error("SUPABASE_SECRET_KEY is not configured on the server.");
  }
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
