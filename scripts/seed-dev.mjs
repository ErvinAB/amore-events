#!/usr/bin/env node
/**
 * DEV ONLY: create local test users and clearly-labelled sample products.
 *   node --env-file=.env.local scripts/seed-dev.mjs
 * Refuses to run against anything except a local Supabase stack.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
  console.error(`Refusing to seed ${url || "(no URL)"} — dev seed is for the local stack only.`);
  process.exit(1);
}
const db = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function user(email, password, admin) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
  let u = list.users.find((x) => x.email === email);
  if (!u) ({ data: { user: u } } = await db.auth.admin.createUser({ email, password, email_confirm: true }));
  if (admin) await db.from("admin_users").upsert({ user_id: u.id, role: "owner" });
  return u;
}
await user("owner@example.test", "local-dev-owner-1", true);
await user("notadmin@example.test", "local-dev-user-1", false);

const cats = Object.fromEntries(((await db.from("categories").select("id, slug")).data ?? []).map((c) => [c.slug, c.id]));
const samples = path.resolve(".dev-samples");
const files = await readdir(samples).catch(() => []);

const products = [
  {
    slug: "engraved-heart-necklace", name: { en: "Engraved Heart Necklace", mk: "Гравиран ѓердан со срце" },
    short_description: { en: "A delicate heart pendant, engraved with a name." },
    description: { en: "SAMPLE PRODUCT for development.\nSterling silver heart pendant on a fine 45 cm chain." },
    price_minor: 149000, stock: 12, is_featured: true, categories: ["jewellery", "love-anniversary"],
    images: ["p-necklace-1.jpg", "p-necklace-2.jpg", "p-necklace-3.jpg"],
    fields: [
      { label: { en: "Name", mk: "Име" }, type: "text", required: true, max_length: 20, placeholder: { en: "e.g. Ana" }, help_text: { en: "We engrave exactly what you type, up to 20 characters." } },
      { label: { en: "Special Date" }, type: "date", required: false },
      { label: { en: "Colour", mk: "Боја" }, type: "select", required: true, options: [
        { value: "gold", label: { en: "Gold", mk: "Злато", sq: "Ari" } },
        { value: "silver", label: { en: "Silver", mk: "Сребро", sq: "Argjend" } },
        { value: "rose-gold", label: { en: "Rose Gold", mk: "Розево злато", sq: "Ari rozë" } } ] },
    ],
  },
  {
    slug: "initial-leather-keyring", name: { en: "Initial Leather Keyring", mk: "Кожен привезок со иницијал" },
    short_description: { en: "Soft leather tag stamped with up to three initials." },
    description: { en: "SAMPLE PRODUCT for development." },
    price_minor: 59000, sale_price_minor: 49000, stock: 3, is_new: true, is_featured: true, categories: ["keychains", "personalised-gifts"],
    images: ["p-keyring-1.jpg", "p-keyring-2.jpg"],
    fields: [{ label: { en: "Initials", mk: "Иницијали" }, type: "text", required: true, max_length: 3 }],
  },
  {
    slug: "message-photo-frame", name: { en: "Message Photo Frame" },
    short_description: { en: "A wooden frame with your message underneath." },
    description: { en: "SAMPLE PRODUCT for development." },
    price_minor: 120000, stock: 8, is_featured: true, categories: ["home-decor"], images: ["p-frame-1.jpg"],
    fields: [{ label: { en: "Message" }, type: "textarea", required: false, max_length: 120 }],
  },
];

for (const p of products) {
  const { categories, images, fields, ...row } = p;
  const { data: prod, error } = await db.from("products").upsert({ ...row, status: "active" }, { onConflict: "slug" }).select("id").single();
  if (error) throw error;
  await db.from("product_categories").delete().eq("product_id", prod.id);
  await db.from("product_categories").insert(categories.map((c) => ({ product_id: prod.id, category_id: cats[c] })));
  await db.from("personalization_fields").delete().eq("product_id", prod.id);
  if (fields.length) await db.from("personalization_fields").insert(fields.map((f, i) => ({ ...f, product_id: prod.id, sort_order: i })));
  const refresh = process.argv.includes("--refresh-images");
  if (refresh) {
    const { data: old } = await db.from("product_images").select("storage_path").eq("product_id", prod.id);
    if (old?.length) await db.storage.from("product-images").remove(old.map((o) => o.storage_path));
    await db.from("product_images").delete().eq("product_id", prod.id);
  }
  const { count } = await db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", prod.id);
  if (!count) {
    for (const [i, file] of images.entries()) {
      if (!files.includes(file)) continue;
      const storage_path = `products/${prod.id}/${randomUUID()}.jpg`;
      await db.storage.from("product-images").upload(storage_path, await readFile(path.join(samples, file)), { contentType: "image/jpeg" });
      await db.from("product_images").insert({ product_id: prod.id, storage_path, width: 1600, height: 2000, sort_order: i });
    }
  }
}
// Category images (stored like real ones; owners replace them later).
for (const slug of Object.keys(cats)) {
  const file = `cat-${slug}.jpg`;
  if (!files.includes(file)) continue;
  const { data: cat } = await db.from("categories").select("image_path").eq("slug", slug).single();
  if (cat?.image_path && !process.argv.includes("--refresh-images")) continue;
  const image_path = `categories/${randomUUID()}.jpg`;
  await db.storage.from("product-images").upload(image_path, await readFile(path.join(samples, file)), { contentType: "image/jpeg" });
  if (cat?.image_path) await db.storage.from("product-images").remove([cat.image_path]);
  await db.from("categories").update({ image_path }).eq("slug", slug);
}

await db.from("store_settings").update({ delivery_fee_minor: 15000, free_delivery_threshold_minor: 300000 }).eq("id", true);
console.log("Seeded local dev data (owner@example.test / local-dev-owner-1). Delivery fee set to a DEV placeholder.");
