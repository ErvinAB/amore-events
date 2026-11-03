import type { Metadata } from "next";
import "../globals.css";
import { onest, spectral } from "../fonts";

export const metadata: Metadata = { title: "Design lab", robots: { index: false, follow: false } };

// Isolated root layout for V0.25 visual explorations. Not part of the storefront.
export default function DesignLabLayout({ children }: LayoutProps<"/design-lab">) {
  return (
    <html lang="en" className={`${spectral.variable} ${onest.variable}`}>
      <body>{children}</body>
    </html>
  );
}
