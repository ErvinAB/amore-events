import { publicEnv } from "@/lib/env";
import { site } from "@/config/site";

/** Durable storage path → public URL (served through next/image). */
export function productImageUrl(storagePath: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${site.productImagesBucket}/${storagePath}`;
}
