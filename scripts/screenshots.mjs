#!/usr/bin/env node
/**
 * Design review screenshots.
 *   node scripts/screenshots.mjs <outDir> <baseUrl> <path> [<path>…]
 * Captures each path at 390, 768 and 1440 px (full page, JPEG).
 * Set WIDTHS=390,1440 to limit. Set BAG=1 to pre-fill the bag first.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [outDir, base, ...paths] = process.argv.slice(2);
const widths = (process.env.WIDTHS ?? "390,768,1440").split(",").map(Number);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, deviceScaleFactor: w < 800 ? 2 : 1, isMobile: w < 800, hasTouch: w < 800 });
  const page = await ctx.newPage();
  if (process.env.BAG) {
    // Two sample products: one with an optional field, one with a required one.
    await page.goto(base + "/en/product/message-photo-frame", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add to bag" }).first().click();
    await page.goto(base + "/en/product/initial-leather-keyring", { waitUntil: "networkidle" });
    await page.getByLabel("Initials").fill("AB");
    await page.getByRole("button", { name: "Add to bag" }).first().click();
  }
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const name = (p.replace(/^\//, "").replace(/[/?=&]+/g, "_") || "root") + `-${w}.jpg`;
    await page.screenshot({ path: path.join(outDir, name), fullPage: true, type: "jpeg", quality: 60 });
    console.log("saved", name);
  }
  await ctx.close();
}
await browser.close();
