"use client";

import { useSyncExternalStore } from "react";
import { addLine, emptyCart, itemCount, parseStoredCart, removeLine, setQuantity, type Cart } from "./lines";

/**
 * Tiny external store over localStorage. Survives refreshes and syncs
 * between tabs. No Redux, no context provider needed.
 */
const KEY = "cart:v1";
const SERVER_SNAPSHOT: Cart = emptyCart();
let current: Cart | null = null;
const listeners = new Set<() => void>();

function read(): Cart {
  if (current) return current;
  try {
    current = parseStoredCart(window.localStorage.getItem(KEY));
  } catch {
    current = emptyCart(); // storage blocked (private mode etc.)
  }
  return current;
}

function write(next: Cart) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep the in-memory cart for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
}

export function useCartCount(): number {
  return itemCount(useCart());
}

export const cartActions = {
  add: (input: Parameters<typeof addLine>[1]) => write(addLine(read(), input)),
  setQuantity: (lineId: string, q: number) => write(setQuantity(read(), lineId, q)),
  remove: (lineId: string) => write(removeLine(read(), lineId)),
  clear: () => write(emptyCart()),
};
