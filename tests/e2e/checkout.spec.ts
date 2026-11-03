/**
 * V0.2 customer journey + tampering, against a production build.
 * Tampering is done by rewriting the real checkout POST in flight, i.e. what
 * a malicious client could send regardless of our UI.
 */
import { expect, test, type Page } from "@playwright/test";
import { adminEditProduct, adminLogin, serviceClient } from "./helpers";

const NECKLACE = "engraved-heart-necklace";
const randomPhone = () => `07${Math.floor(1_000_000 + Math.random() * 8_999_999)}`; // 07X XXX XXX → +3897…

async function product(slug: string) {
  const { data } = await serviceClient()
    .from("products")
    .select("id, price_minor, sale_price_minor, stock, personalization_fields(id, label, type, options)")
    .eq("slug", slug)
    .single();
  return data!;
}

async function addNecklace(page: Page, locale: string, name: string, colourLabel: string) {
  await page.goto(`/${locale}/product/${NECKLACE}`);
  await page.locator("main input:not([type])").first().fill(name);
  await page.locator("main select").first().selectOption({ label: colourLabel });
  await page.locator("main").getByRole("button", { name: /Add to bag|Додај во кошничка|Shto në shportë/ }).click();
}

async function fillCheckout(page: Page, phone: string) {
  await page.locator("#first_name").fill("Test");
  await page.locator("#last_name").fill("Customer");
  await page.locator("#phone").fill(phone);
  await page.locator("#street_address").fill("Ul. Testna 1");
  await page.locator("#city").fill("Skopje");
  await page.waitForTimeout(3200); // realistic completion time (form token)
}

async function latestOrderFor(phone: string) {
  const normalized = `+389${phone.slice(1)}`;
  const { data } = await serviceClient()
    .from("orders")
    .select("*, order_items(*)")
    .eq("phone_normalized", normalized)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Rewrite the "cart" field of the checkout Server Action POST. React encodes
 * action FormData fields with an id prefix (e.g. `_1_cart`), so match that.
 * Returns a probe so each test can assert the tampering really happened.
 */
async function tamperCart(page: Page, mutate: (lines: Record<string, unknown>[]) => unknown[]) {
  const probe = { tampered: 0 };
  await page.route("**/checkout", async (route) => {
    const req = route.request();
    const body = req.postData();
    const re = /(name="(?:_?\d+_)?cart"\r\n\r\n)([\s\S]*?)(\r\n--)/;
    if (req.method() !== "POST" || !body || !re.test(body)) return route.continue();
    const replaced = body.replace(re, (_m, a: string, json: string, c: string) => a + JSON.stringify(mutate(JSON.parse(json))) + c);
    probe.tampered++;
    return route.continue({ postData: replaced });
  });
  return probe;
}

test.describe.configure({ mode: "serial" });

// Each test is a different visitor IP (on Vercel the platform sets this header;
// here it lets repeated runs avoid the per-IP limit, which pgTAP tests cover).
test.beforeEach(async ({ page }) => {
  const ip = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
});

// Give the suite enough stock, through the admin UI so storefront caches are expired properly.
test.beforeAll(async ({ browser }) => {
  const { data } = await serviceClient().from("products").select("id").eq("slug", NECKLACE).single();
  const page = await browser.newPage();
  await adminLogin(page);
  await adminEditProduct(page, data!.id, async (p) => {
    await p.getByLabel("Залиха", { exact: true }).fill("200");
  });
  await page.close();
});

test("customer completes a personalised COD order (EN, mobile)", async ({ page }) => {
  const before = await product(NECKLACE);
  const phone = randomPhone();
  await addNecklace(page, "en", "Ana", "Rose Gold");
  await addNecklace(page, "en", "Marko", "Gold");
  await page.goto("/en/cart");
  await expect(page.getByText("Name: Ana")).toBeVisible();
  await expect(page.getByText("Name: Marko")).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  await expect(page.getByText("Cash on delivery", { exact: true })).toBeVisible();
  await expect(page.locator("input[type=radio]")).toHaveCount(0); // no payment selector
  await fillCheckout(page, phone);
  await page.locator("#delivery_notes").fill("Ring twice");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/en\/order-success$/);
  await expect(page.getByText("We may contact you by phone to confirm your order or delivery details.")).toBeVisible();
  const shownNumber = await page.locator("dd[translate=no]").innerText();

  const [order] = await latestOrderFor(phone);
  const unit = before.sale_price_minor ?? before.price_minor;
  expect(order.order_number).toBe(shownNumber);
  expect(order).toMatchObject({ status: "new", payment_method: "cash_on_delivery", payment_status: "unpaid", locale: "en", city: "Skopje", delivery_notes: "Ring twice" });
  expect(order.subtotal_minor).toBe(unit * 2);
  expect(order.total_minor).toBe(order.subtotal_minor + order.delivery_fee_minor);
  expect(order.order_items).toHaveLength(2);
  expect(order.order_items.map((i: { personalization: { value: string }[] }) => i.personalization[0].value).sort()).toEqual(["Ana", "Marko"]);
  expect((await product(NECKLACE)).stock).toBe(before.stock - 2);
  // Bag is emptied after a confirmed order.
  await page.goto("/en/cart");
  await expect(page.getByText("Your bag is empty.")).toBeVisible();
});

test("tampered browser price and extra fields are ignored", async ({ page }) => {
  const p = await product(NECKLACE);
  const phone = randomPhone();
  await addNecklace(page, "en", "Tess", "Silver");
  await page.goto("/en/checkout");
  await fillCheckout(page, phone);
  const probe = await tamperCart(page, (lines) =>
    lines.map((l) => ({ ...l, price_minor: 1, unit_price_minor: 1, sale_price_minor: 1, total_minor: 1, name: "FREE" })),
  );
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(probe.tampered, "the tampered request was actually sent").toBe(1);
  const [order] = await latestOrderFor(phone);
  expect(order.order_items[0].unit_price_minor).toBe(p.sale_price_minor ?? p.price_minor);
  expect(order.order_items[0].product_name.en).toBe("Engraved Heart Necklace");
});

for (const [label, mutate] of [
  ["an invalid select option", (l: Record<string, unknown>) => {
    const pers = { ...(l.personalization as Record<string, string>) };
    for (const k of Object.keys(pers)) if (pers[k] === "silver") pers[k] = "platinum";
    return { ...l, personalization: pers };
  }],
  ["a too-long engraving", (l: Record<string, unknown>) => {
    const pers = { ...(l.personalization as Record<string, string>) };
    for (const k of Object.keys(pers)) if (pers[k] === "Tess") pers[k] = "x".repeat(40);
    return { ...l, personalization: pers };
  }],
  ["a nonexistent product", (l: Record<string, unknown>) => ({ ...l, productId: "00000000-0000-4000-8000-000000000000" })],
  ["an impossible quantity", (l: Record<string, unknown>) => ({ ...l, quantity: 500 })],
] as const) {
  test(`rejects ${label} sent by a tampered client`, async ({ page }) => {
    const phone = randomPhone();
    const stockBefore = (await product(NECKLACE)).stock;
    await addNecklace(page, "en", "Tess", "Silver");
    await page.goto("/en/checkout");
    await fillCheckout(page, phone);
    const probe = await tamperCart(page, (lines) => lines.map((l) => mutate(l)));
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.locator("#checkout-error")).toBeVisible();
    expect(probe.tampered, "the tampered request was actually sent").toBe(1);
    await expect(page).toHaveURL(/\/en\/checkout$/);
    expect(await latestOrderFor(phone)).toHaveLength(0);
    expect((await product(NECKLACE)).stock).toBe(stockBefore);
  });
}

test("honeypot submissions never create an order", async ({ page }) => {
  const phone = randomPhone();
  await addNecklace(page, "en", "Bot", "Gold");
  await page.goto("/en/checkout");
  await fillCheckout(page, phone);
  await page.locator("#company_website").fill("http://spam.example", { force: true });
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.locator("#checkout-error")).toBeVisible();
  expect(await latestOrderFor(phone)).toHaveLength(0);
});

test("instant (bot-speed) submissions are refused, then a normal retry works", async ({ page }) => {
  const phone = randomPhone();
  await addNecklace(page, "en", "Quick", "Gold");
  await page.goto("/en/checkout");
  await page.locator("#first_name").fill("Q");
  await page.locator("#last_name").fill("Uick");
  await page.locator("#phone").fill(phone);
  await page.locator("#street_address").fill("Ul. Brza 1");
  await page.locator("#city").fill("Bitola");
  await expect(page.getByRole("button", { name: "Place order" })).toBeEnabled();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.locator("#checkout-error")).toContainText("press Place order again");
  expect(await latestOrderFor(phone)).toHaveLength(0);
  await page.waitForTimeout(3200);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/order-success/);
  expect(await latestOrderFor(phone)).toHaveLength(1);
});

test("double submission creates only one order", async ({ page }) => {
  const phone = randomPhone();
  await addNecklace(page, "en", "Twice", "Gold");
  await page.goto("/en/checkout");
  await fillCheckout(page, phone);
  const button = page.getByRole("button", { name: "Place order" });
  await button.dblclick();
  await expect(page).toHaveURL(/order-success/);
  expect(await latestOrderFor(phone)).toHaveLength(1);
});

test("Macedonian and Albanian checkouts work and record the locale", async ({ page }) => {
  for (const [locale, colour, button, success] of [
    ["mk", "Злато", "Нарачај", "Може да ве контактираме по телефон"],
    ["sq", "Ari", "Porosit", "Mund t’ju kontaktojmë me telefon"],
  ] as const) {
    const phone = randomPhone();
    await addNecklace(page, locale, "Ема", colour);
    await page.goto(`/${locale}/checkout`);
    await fillCheckout(page, phone);
    await page.getByRole("button", { name: button }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/order-success$`));
    await expect(page.getByText(success)).toBeVisible();
    const [order] = await latestOrderFor(phone);
    expect(order.locale).toBe(locale);
  }
});

test("there is no public order lookup", async ({ page }) => {
  const { data } = await serviceClient().from("orders").select("order_number, first_name, street_address").limit(1).single();
  // Fresh browser context: no confirmation cookie. Query parameters must not unlock anything.
  for (const path of ["/en/order-success", `/en/order-success?order=${data!.order_number}`, `/en/order-success?id=${data!.order_number}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No recent order to show");
    await expect(page.getByText("Order number")).toHaveCount(0);
    await expect(page.getByText("Total to pay on delivery")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(data!.street_address);
  }
  // A forged/unsigned confirmation cookie is ignored.
  await page.context().addCookies([
    { name: "order_confirmation", value: "eyJvcmRlck51bWJlciI6Ik9SRC0yMDI2LTAwMDAwMSJ9.deadbeef", url: page.url() },
  ]);
  await page.goto("/en/order-success");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No recent order to show");
});
