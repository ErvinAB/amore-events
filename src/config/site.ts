/**
 * Build-time defaults. Business details that owners change (contacts, fees,
 * currency, socials) live in the `store_settings` table instead.
 */
export const site = {
  /** PLACEHOLDER — final brand name not yet supplied. */
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Gift Store",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  productImagesBucket: "product-images",
} as const;
