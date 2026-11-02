import { adminT } from "@/messages/admin";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export const metadata = { title: adminT.login.title };

export default function AdminLoginPage() {
  return (
    <main className="gutter flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm rounded-control border border-line bg-paper p-6 sm:p-8">
        <p className="text-sm text-ink-muted">{site.name}</p>
        <h1 className="heading-2 mt-1">{adminT.login.title}</h1>
        <p className="mt-2 mb-6 text-ink-muted">{adminT.login.intro}</p>
        <LoginForm t={adminT.login} />
      </div>
    </main>
  );
}
