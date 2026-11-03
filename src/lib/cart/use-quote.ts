"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartLine } from "./lines";
import { quoteCart } from "@/lib/checkout/actions";
import type { CartQuote } from "@/lib/checkout/quote";

/**
 * Authoritative quote for the current cart (current prices, stock and
 * options from the server). Re-fetches whenever the cart changes or
 * `refresh()` is called. `loading` is derived: the shown quote is for an
 * older cart/refresh.
 */
export function useCartQuote(lines: CartLine[]) {
  const [nonce, setNonce] = useState(0);
  const key = `${nonce}|${JSON.stringify(lines.map((l) => [l.lineId, l.quantity]))}`;
  const [result, setResult] = useState<{ key: string; quote: CartQuote | null; error: boolean }>({
    key: "",
    quote: null,
    error: false,
  });

  useEffect(() => {
    let alive = true;
    quoteCart(lines).then(
      (quote) => alive && setResult({ key, quote, error: !quote }),
      () => alive && setResult({ key, quote: null, error: true }),
    );
    return () => {
      alive = false;
    };
    // `key` captures everything about `lines` that affects the quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { quote: result.quote, error: result.error, loading: result.key !== key, refresh };
}
