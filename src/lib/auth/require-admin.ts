import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string | null; role: "owner" | "staff" };

/**
 * Returns the signed-in admin or null. Verifies the JWT with getClaims()
 * and checks the admin_users table (being signed in is not enough).
 */
export const getAdmin = cache(async function getAdmin(): Promise<AdminUser | null> {
  // Auth is always request-time (getClaims checks token expiry against the clock).
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;

  const { data: row } = await supabase.from("admin_users").select("role").eq("user_id", sub).maybeSingle();
  if (!row) return null;

  return {
    id: sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    role: row.role === "staff" ? "staff" : "owner",
  };
});

/**
 * Call at the top of EVERY admin page and Server Action.
 * Server Actions are separately reachable endpoints, so layout checks alone
 * are not enough. RLS remains the final gate.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
