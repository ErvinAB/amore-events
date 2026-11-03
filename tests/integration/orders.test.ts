/**
 * Runs against the LOCAL Supabase stack. Proves properties that need real
 * concurrent connections or the public REST API.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const slug = `it-last-one-${Date.now()}`;
let productId = "";
const customer = (phone: string) => ({
  first_name: "Test", last_name: "Buyer", phone, phone_normalized: phone,
  street_address: "Test street 1", city: "Skopje",
});

beforeAll(async () => {
  const { data, error } = await service
    .from("products")
    .insert({ slug, name: { en: "Last one" }, price_minor: 1000, stock: 1, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  productId = data.id;
});

afterAll(async () => {
  const { data: items } = await service.from("order_items").select("order_id").eq("product_id", productId);
  const ids = [...new Set((items ?? []).map((i) => i.order_id))];
  if (ids.length) await service.from("orders").delete().in("id", ids);
  await service.from("products").delete().eq("id", productId);
});

describe("concurrent checkout", () => {
  it("cannot oversell the last item when many customers order at once", async () => {
    const attempts = Array.from({ length: 8 }, (_, i) =>
      service.rpc("place_order", {
        p_customer: customer(`+3897555000${i}`),
        p_lines: [{ product_id: productId, quantity: 1, personalization: {} }],
        p_locale: "en",
        p_ip_hash: null,
      }),
    );
    const results = await Promise.all(attempts);
    const ok = results.filter((r) => !r.error);
    const outOfStock = results.filter((r) => r.error?.message === "OUT_OF_STOCK");
    expect(ok).toHaveLength(1);
    expect(outOfStock).toHaveLength(7);
    const { data } = await service.from("products").select("stock").eq("id", productId).single();
    expect(data!.stock).toBe(0);
  });
});

describe("public API cannot touch orders", () => {
  it("anonymous clients cannot call place_order", async () => {
    const { error } = await anon.rpc("place_order", {
      p_customer: customer("+38975559999"),
      p_lines: [{ product_id: productId, quantity: 1 }],
      p_locale: "en",
      p_ip_hash: null,
    });
    expect(error).not.toBeNull();
    expect(error!.code === "42501" || error!.code === "PGRST202").toBe(true);
  });

  it("anonymous clients cannot read orders or items", async () => {
    for (const table of ["orders", "order_items", "checkout_attempts"]) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error, table).not.toBeNull();
      expect(data).toBeNull();
    }
  });

  it("a signed-in non-admin cannot read orders", async () => {
    const user = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await user.auth.signInWithPassword({ email: "notadmin@example.test", password: "local-dev-user-1" });
    const { data } = await user.from("orders").select("id, phone, street_address").limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it("anonymous clients cannot call cancel_order or the throttle", async () => {
    expect((await anon.rpc("cancel_order", { p_order_id: productId })).error).not.toBeNull();
    expect((await anon.rpc("register_checkout_attempt", { p_ip_hash: "a".repeat(64) })).error).not.toBeNull();
  });
});
