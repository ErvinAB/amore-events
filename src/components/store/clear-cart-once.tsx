"use client";

import { useEffect } from "react";
import { cartActions } from "@/lib/cart/store";

/** Empties the bag once per confirmed order (refreshing the page won't wipe a new bag). */
export function ClearCartOnce({ orderNumber }: { orderNumber: string }) {
  useEffect(() => {
    const key = "cart:cleared-for";
    try {
      if (window.localStorage.getItem(key) === orderNumber) return;
      window.localStorage.setItem(key, orderNumber);
    } catch {
      // storage blocked: still clear the in-memory bag
    }
    cartActions.clear();
  }, [orderNumber]);
  return null;
}
