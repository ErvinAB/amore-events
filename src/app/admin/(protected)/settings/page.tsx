import { requireAdmin } from "@/lib/auth/require-admin";
import { adminT } from "@/messages/admin";

export const metadata = { title: adminT.settings.title };

export default async function Page() {
  await requireAdmin();
  return (
    <div>
      <h1 className="heading-1">{adminT.settings.title}</h1>
      <p className="mt-3 text-ink-muted">{adminT.settings.comingSoon}</p>
    </div>
  );
}
