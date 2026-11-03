import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { CheckoutForm } from "@/components/store/checkout-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <main id="main" className="gutter mx-auto w-full max-w-content flex-1 py-10 sm:py-14">
      <h1 className="heading-1 mb-8">{dict.checkout.title}</h1>
      <CheckoutForm locale={locale} t={dict} />
    </main>
  );
}
