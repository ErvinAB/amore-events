import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { notFound } from "next/navigation";

// Temporary foundation page — replaced by the real homepage in step ⑫.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <main id="main" className="gutter mx-auto w-full max-w-content py-16">
      <h1 className="heading-display max-w-prose">{dict.home.heroTitle}</h1>
      <p className="mt-4 max-w-prose text-lg text-ink-muted">{dict.home.heroBody}</p>
    </main>
  );
}
