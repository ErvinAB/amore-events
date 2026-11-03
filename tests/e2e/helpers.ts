import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL ?? "owner@example.test",
  password: process.env.TEST_ADMIN_PASSWORD ?? "local-dev-owner-1",
};

/** Service client for fixtures only (local stack). Never used by the app under test. */
export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Е-пошта").fill(ADMIN.email);
  await page.getByLabel("Лозинка").fill(ADMIN.password);
  await page.getByRole("button", { name: "Најави се" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Edit a product through the real admin form (server action + updateTag). */
export async function adminEditProduct(page: Page, id: string, edit: (page: Page) => Promise<void>) {
  await page.goto(`/admin/products/${id}`);
  await edit(page);
  await page.locator("main form").first().getByRole("button", { name: "Зачувај", exact: true }).click();
  await expect(page.locator("main [role=status]").first()).toHaveText("Зачувано.");
}

/** A brand-new, cookie-less request: what an anonymous visitor's first load gets. */
export async function publicGet(request: APIRequestContext, path: string) {
  const res = await request.get(path, { headers: { cookie: "" }, maxRedirects: 0 });
  return { status: res.status(), html: await res.text() };
}
