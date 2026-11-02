import { requireAdmin } from "@/lib/auth/require-admin";
import { adminT } from "@/messages/admin";

export const metadata = { title: adminT.orders.title };

export default async function Page() {
  await requireAdmin();
  return (
    <div>
      <h1 className="heading-1">{adminT.orders.title}</h1>
      <p className="mt-3 text-ink-muted">{adminT.orders.comingSoon}</p>
    </div>
  );
}

// Admin pages are request-time (auth); they intentionally block navigation.
export const instant = false;
