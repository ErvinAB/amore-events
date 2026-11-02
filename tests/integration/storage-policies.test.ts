/**
 * Runs against the LOCAL Supabase stack (npx supabase start).
 * Needs .env.local with local keys and the dev users created by
 * scripts/create-admin.mjs (owner) plus a non-admin user.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const OWNER = { email: process.env.TEST_ADMIN_EMAIL ?? "owner@example.test", password: process.env.TEST_ADMIN_PASSWORD ?? "local-dev-owner-1" };
const USER = { email: process.env.TEST_USER_EMAIL ?? "notadmin@example.test", password: process.env.TEST_USER_PASSWORD ?? "local-dev-user-1" };
const bucket = "product-images";
const png = new Blob([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="), (c) => c.charCodeAt(0))], { type: "image/png" });
const path = (folder = "products") => `${folder}/00000000-0000-0000-0000-000000000000/${crypto.randomUUID()}.png`;

function client() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function signedIn(creds: { email: string; password: string }) {
  const c = client();
  const { error } = await c.auth.signInWithPassword(creds);
  if (error) throw new Error(`sign-in failed for ${creds.email}: ${error.message}`);
  return c;
}

describe("product-images storage policies", () => {
  let anon: SupabaseClient, user: SupabaseClient, admin: SupabaseClient;
  beforeAll(async () => {
    anon = client();
    [user, admin] = await Promise.all([signedIn(USER), signedIn(OWNER)]);
  });

  it("anonymous visitors cannot upload", async () => {
    const { error } = await anon.storage.from(bucket).upload(path(), png, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("signed-in non-admins cannot upload", async () => {
    const { error } = await user.storage.from(bucket).upload(path(), png, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("admins can upload under products/ and delete", async () => {
    const p = path();
    const up = await admin.storage.from(bucket).upload(p, png, { contentType: "image/png" });
    expect(up.error).toBeNull();
    const rm = await admin.storage.from(bucket).remove([p]);
    expect(rm.error).toBeNull();
    expect(rm.data?.length).toBe(1);
  });

  it("admins cannot upload outside allowed folders", async () => {
    const { error } = await admin.storage.from(bucket).upload(path("anything"), png, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("the bucket rejects non-image types (e.g. SVG/HTML)", async () => {
    const svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"], { type: "image/svg+xml" });
    const { error } = await admin.storage.from(bucket).upload(path().replace(".png", ".svg"), svg, { contentType: "image/svg+xml" });
    expect(error).not.toBeNull();
  });

  it("non-admins cannot delete existing objects", async () => {
    const p = path();
    await admin.storage.from(bucket).upload(p, png, { contentType: "image/png" });
    const { data } = await user.storage.from(bucket).remove([p]);
    expect(data?.length ?? 0).toBe(0);
    const still = await admin.storage.from(bucket).list(p.split("/").slice(0, 2).join("/"));
    expect(still.data?.some((o) => p.endsWith(o.name))).toBe(true);
    await admin.storage.from(bucket).remove([p]);
  });
});
