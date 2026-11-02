import { z } from "zod";

/**
 * Public env (safe in the browser). Validated lazily so a missing value
 * produces a clear error instead of a confusing Supabase failure.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export function publicEnv() {
  // Referenced explicitly so Next can inline them into client bundles.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid Supabase environment variables. Copy .env.example to .env.local and fill them in.",
    );
  }
  return parsed.data;
}
