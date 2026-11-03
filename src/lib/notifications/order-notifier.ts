import "server-only";

/**
 * Owner notification boundary. Called AFTER the order transaction commits,
 * outside the request (next/server `after`). It must never throw into the
 * checkout flow: the database order is the source of truth and a failed
 * notification never affects, duplicates or invalidates an order.
 *
 * PROVIDER PENDING: no email provider has been chosen yet (V0.2 decision).
 * Implement `OrderNotifier` for the chosen provider and select it with
 * ORDER_NOTIFIER=<name>. On success the caller sets orders.owner_notified_at,
 * so unsent notifications can be found (and retried) later.
 */
export type NewOrderEvent = {
  orderId: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  itemCount: number;
  locale: string;
};

export interface OrderNotifier {
  readonly name: string;
  /** Resolve true only if the owner was actually notified. */
  notifyNewOrder(event: NewOrderEvent): Promise<boolean>;
}

/** Default until a provider is chosen: logs the order number only (no customer PII). */
const logNotifier: OrderNotifier = {
  name: "log",
  async notifyNewOrder(e) {
    console.info(`[orders] new order ${e.orderNumber} (${e.itemCount} items) — no notification provider configured yet`);
    return false;
  },
};

const notifiers: Record<string, OrderNotifier> = { log: logNotifier };

export function getOrderNotifier(): OrderNotifier {
  return notifiers[process.env.ORDER_NOTIFIER ?? "log"] ?? logNotifier;
}
