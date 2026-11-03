import { expect, test } from "@playwright/test";

const NECKLACE = "/en/product/engraved-heart-necklace";

test("phone sticky Add to bag appears off-screen, hides by the main button, and validates", async ({ page }) => {
  await page.goto(NECKLACE);
  const addButtons = page.getByRole("button", { name: "Add to bag" });

  // The main button sits below the gallery, so the bar is offered straight away.
  await expect(addButtons).toHaveCount(2);

  // Once the main button is on screen the bar steps aside (and leaves the a11y tree).
  await page.getByRole("group", { name: "Quantity" }).scrollIntoViewIfNeeded();
  await expect(addButtons).toHaveCount(1);

  // Back at the top, the bar returns; tapping it with empty required fields
  // focuses the first one instead of adding anything.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(addButtons).toHaveCount(2);
  await addButtons.last().click();
  await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused();
  await expect(page.getByText("Please fill this in.").first()).toBeVisible();
});

test("category pages mark the current category and show delivery facts on products", async ({ page }) => {
  await page.goto("/en/category/jewellery");
  const nav = page.getByRole("navigation", { name: "Browse by category" });
  await expect(nav.getByRole("link", { name: "Jewellery" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current", "page");

  await page.goto(NECKLACE);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeHidden(); // phones: category link above the title instead
  await expect(page.locator("main dl").getByText("Delivery", { exact: true })).toBeVisible();
});
