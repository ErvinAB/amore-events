"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { createSupabaseSecretClient } from "@/lib/supabase/admin";
import { hmac } from "@/lib/server/secrets";
import { getOrderNotifier } from "@/lib/notifications/order-notifier";
import { parseCustomer, type CustomerErrorCode } from "./schema";
import { issueFormToken, verifyFormToken } from "./form-token";
import { quoteInputSchema, quoteLines, type CartQuote } from "./quote";
import { CONFIRMATION_COOKIE, CONFIRMATION_MAX_AGE_S, signConfirmation } from "./confirmation";

/** Authoritative cart quote for the bag and checkout summary. */
export async function quoteCart(lines: unknown): Promise<CartQuote | null> {
  const parsed = quoteInputSchema.safeParse(lines);
  if (!parsed.success) return null;
  return quoteLines(parsed.data);
}

export async function getCheckoutToken(): Promise<string> {
  return issueFormToken();
}

export type CheckoutFormError = "generic" | "cartChanged" | "emptyCart" | "rateLimited" | "tooFast" | "sessionExpired";

export type CheckoutState = {
  fieldErrors?: Partial<Record<string, CustomerErrorCode>>;
  formError?: CheckoutFormError;
  /** Ask the client to refresh its quote (prices/stock/options changed). */
  refreshCart?: boolean;
};

const RPC_ERRORS: Record<string, CheckoutFormError> = {
  PRODUCT_UNAVAILABLE: "cartChanged",
  OUT_OF_STOCK: "cartChanged",
  INVALID_PERSONALIZATION: "cartChanged",
  PERSONALIZATION_REQUIRED: "cartChanged",
  PERSONALIZATION_TOO_LONG: "cartChanged",
  EMPTY_CART: "emptyCart",
  RATE_LIMITED: "rateLimited",
};

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip ? hmac("ip", ip) : null;
}

/**
 * The only path that creates orders. The browser sends identifiers,
 * quantities, personalisation and customer details; everything else is
 * computed by the database inside place_order().
 */
export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const localeRaw = String(form.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";

  // 1. Honeypot. A filled honeypot gets a generic error (never a fake order).
  if (String(form.get("company_website") ?? "") !== "") return { formError: "generic" };

  // 2. Customer details first, so a person who taps early sees what's missing.
  const customer = parseCustomer(Object.fromEntries(form.entries()));
  if (!customer.ok) return { fieldErrors: customer.errors };

  // 3. Realistic completion time (signed token issued when the form opened).
  const token = verifyFormToken(form.get("form_token"));
  if (token === "tooFast") return { formError: "tooFast" };
  if (token !== "ok") return { formError: "sessionExpired" };

  // 4. Per-IP submission throttle (generous: households, workplaces, CGNAT).
  const ipHash = await clientIpHash();
  const db = createSupabaseSecretClient();
  if (ipHash) {
    const { data: allowed, error } = await db.rpc("register_checkout_attempt", { p_ip_hash: ipHash });
    if (error) {
      console.error("checkout: throttle check failed", error.message);
      return { formError: "generic" };
    }
    if (!allowed) return { formError: "rateLimited" };
  }

  // 5. Cart: structure, then current catalogue + personalisation rules.
  let rawCart: unknown;
  try {
    rawCart = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    return { formError: "generic" };
  }
  const lines = quoteInputSchema.safeParse(rawCart);
  if (!lines.success) return { formError: "cartChanged", refreshCart: true };
  if (lines.data.length === 0) return { formError: "emptyCart" };
  const quote = await quoteLines(lines.data);
  if (!quote.canCheckout) return { formError: "cartChanged", refreshCart: true };

  // 6. Authoritative, transactional order creation.
  const { data, error } = await db.rpc("place_order", {
    p_customer: customer.value,
    p_lines: quote.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, personalization: l.normalized })),
    p_locale: locale,
    p_ip_hash: ipHash ?? undefined,
  });
  if (error || !data) {
    const code = error?.message ?? "";
    if (!RPC_ERRORS[code]) console.error("checkout: place_order failed", code || error);
    return { formError: RPC_ERRORS[code] ?? "generic", refreshCart: RPC_ERRORS[code] === "cartChanged" };
  }
  const order = data as {
    order_id: string;
    order_number: string;
    total_minor: number;
    currency_code: string;
    duplicate: boolean;
  };

  // 7. Owner notification AFTER commit, outside the response. Never throws into checkout.
  if (!order.duplicate) {
    after(async () => {
      try {
        const sent = await getOrderNotifier().notifyNewOrder({
          orderId: order.order_id,
          orderNumber: order.order_number,
          totalMinor: order.total_minor,
          currency: order.currency_code,
          itemCount: quote.lines.reduce((n, l) => n + l.quantity, 0),
          locale,
        });
        if (sent) {
          await createSupabaseSecretClient().from("orders").update({ owner_notified_at: new Date().toISOString() }).eq("id", order.order_id);
        }
      } catch (e) {
        console.error(`orders: owner notification failed for ${order.order_number}`, e);
      }
    });
  }

  // 8. Sanitized confirmation only (no customer data, no lookup by number).
  (await cookies()).set(
    CONFIRMATION_COOKIE,
    signConfirmation({ orderNumber: order.order_number, totalMinor: order.total_minor, currency: order.currency_code, issuedAt: Date.now() }),
    { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: CONFIRMATION_MAX_AGE_S },
  );
  redirect(localePath(locale, "/order-success"));
}
