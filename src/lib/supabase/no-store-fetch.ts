/**
 * Supabase requests must never be cached by Next's fetch cache. Caching is
 * done explicitly with `'use cache'` + cacheTag(CATALOG_TAG), which admin
 * edits expire. Without this, Next persisted raw Supabase responses in
 * .next/cache/fetch-cache and reused them across builds (stale prices on
 * deploy — found during V0.1 verification).
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
