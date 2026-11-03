/**
 * Regression: after an admin edit, the FIRST public request must show the
 * new data on every surface (product, shop, category, home), and unknown
 * products must return a real 404 on the first request.
 * Root cause found in V0.1: `partialPrefetching: true` served stale partial
 * prerenders for param routes (see docs/PROJECT_PLAN.md §13a).
 */
import { expect, test } from "@playwright/test";
import { adminEditProduct, adminLogin, publicGet, serviceClient } from "./helpers";

const slug = `e2e-fresh-${Date.now()}`;
const name = `E2E Freshness ${Date.now()}`;
let productId = "";

test.beforeAll(async ({ browser }) => {
  // Create the fixture through the real admin UI (so the cache is invalidated
  // exactly as when an owner creates a product).
  const page = await browser.newPage();
  await adminLogin(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Англиски (задолжително)").first().fill(name);
  await page.getByLabel("Адреса (slug)").fill(slug);
  await page.getByLabel("Цена (MKD)", { exact: true }).fill("1500");
  await page.getByLabel("Залиха", { exact: true }).fill("10");
  await page.getByLabel("Статус").selectOption("active");
  await page.getByLabel("Истакнат на почетна").check();
  await page.getByLabel("Jewellery").check();
  await page.getByRole("button", { name: "Креирај" }).click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}\?created=1/);
  productId = new URL(page.url()).pathname.split("/").pop()!;
  await page.close();
});

test.afterAll(async () => {
  await serviceClient().from("products").delete().eq("id", productId);
});

test("price change is visible on the first request everywhere", async ({ page, request }) => {
  // Warm every cache with the old price.
  for (const p of [`/en/product/${slug}`, `/mk/product/${slug}`, "/en/shop", "/en/category/jewellery", "/en"]) {
    const r = await publicGet(request, p);
    expect(r.status, p).toBe(200);
    expect(r.html, p).toMatch(/MKD.1,500|1\.500.ден\./);
  }
  await adminLogin(page);
  // One full edit → visit cycle first: the V0.1 bug only appeared once a page
  // had been regenerated at least once after an invalidation.
  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Цена (MKD)", { exact: true }).fill("1600");
  });
  for (const p of [`/en/product/${slug}`, `/mk/product/${slug}`, "/en/shop", "/en/category/jewellery", "/en"]) {
    expect((await publicGet(request, p)).html, p).toMatch(/MKD.1,600|1\.600.ден\./);
  }
  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Цена (MKD)", { exact: true }).fill("1750");
  });

  const product = await publicGet(request, `/en/product/${slug}`);
  expect(product.html).toContain("MKD 1,750");
  expect(product.html).not.toContain("MKD 1,500");
  expect((await publicGet(request, `/mk/product/${slug}`)).html).toContain("1.750 ден.");
  for (const p of ["/en/shop", "/en/category/jewellery", "/en"]) {
    const html = (await publicGet(request, p)).html;
    const card = html.slice(html.indexOf(name), html.indexOf(name) + 1500);
    expect(card, p).toContain("MKD 1,750");
  }
});

test("stock changes are visible on the first request", async ({ page, request }) => {
  await publicGet(request, `/en/product/${slug}`);
  await adminLogin(page);
  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Залиха", { exact: true }).fill("3");
  });
  expect((await publicGet(request, `/en/product/${slug}`)).html).toContain("Only 3 left");
  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Залиха", { exact: true }).fill("2");
  });
  expect((await publicGet(request, `/en/product/${slug}`)).html).toContain("Only 2 left");

  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Залиха", { exact: true }).fill("0");
  });
  const soldOut = (await publicGet(request, `/en/product/${slug}`)).html;
  expect(soldOut).toContain("Sold out");
  expect(soldOut).not.toContain(">Add to bag<");
});

test("archiving removes the product on the first request; reactivating restores it", async ({ page, request }) => {
  await publicGet(request, `/en/product/${slug}`);
  await adminLogin(page);
  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Статус").selectOption("archived");
  });
  expect((await publicGet(request, `/en/product/${slug}`)).status).toBe(404);
  expect((await publicGet(request, "/en/shop")).html).not.toContain(name);
  expect((await publicGet(request, "/en/category/jewellery")).html).not.toContain(name);

  await adminEditProduct(page, productId, async (p) => {
    await p.getByLabel("Статус").selectOption("active");
  });
  expect((await publicGet(request, `/en/product/${slug}`)).status).toBe(200);
  expect((await publicGet(request, "/en/shop")).html).toContain(name);
});

test("a never-existing product returns 404 on its very first request", async ({ request }) => {
  const unique = `never-existed-${Date.now()}`;
  for (const l of ["en", "mk", "sq"]) {
    expect((await publicGet(request, `/${l}/product/${unique}-${l}`)).status).toBe(404);
  }
  expect((await publicGet(request, `/en/category/${unique}`)).status).toBe(404);
});

test("build-time prerendered product shows a new price on the first request", async ({ page, request }) => {
  // This is the exact V0.1 failure: pages listed in generateStaticParams.
  const db = serviceClient();
  const { data: built } = await db
    .from("products")
    .select("id, slug, price_minor, created_at")
    .eq("status", "active")
    .neq("slug", slug)
    .order("created_at")
    .limit(1)
    .single();
  test.skip(!built, "needs at least one active product that existed at build time");
  const original = built!.price_minor;
  const path = `/en/product/${built!.slug}`;
  try {
    await adminLogin(page);
    for (const value of ["111", "222"]) {
      await publicGet(request, path); // warm / regenerate
      await adminEditProduct(page, built!.id, async (p) => {
        await p.getByLabel("Цена (MKD)", { exact: true }).fill(value);
      });
      const html = (await publicGet(request, path)).html;
      expect(html, `first request after setting ${value}`).toContain(`MKD ${value}`);
    }
  } finally {
    await adminEditProduct(page, built!.id, async (p) => {
      await p.getByLabel("Цена (MKD)", { exact: true }).fill(String(original / 100));
    });
  }
});
