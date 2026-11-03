import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { BagView } from "@/components/store/bag-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.bag.title, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <main id="main" className="gutter mx-auto w-full max-w-content flex-1 py-10 sm:py-14">
      <h1 className="heading-1 mb-8">{dict.bag.title}</h1>
      <BagView locale={locale} t={dict} />
    </main>
  );
}
