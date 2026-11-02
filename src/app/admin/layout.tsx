import type { Metadata } from "next";
import "../globals.css";
import { onest, spectral } from "../fonts";
import { adminHtmlLang, adminT } from "@/messages/admin";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: `${adminT.appName} · ${site.name}`, template: `%s · ${adminT.appName}` },
  robots: { index: false, follow: false },
};

// Admin root layout. Its language is independent of the storefront default.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang={adminHtmlLang} className={`${spectral.variable} ${onest.variable}`}>
      <body className="min-h-dvh bg-tissue/40">{children}</body>
    </html>
  );
}
