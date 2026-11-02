import { getLocaleAndDictionary } from "@/i18n/server";
import { localePath } from "@/i18n/config";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const { locale, dict } = await getLocaleAndDictionary();
  return (
    <main id="main" className="gutter mx-auto flex w-full max-w-prose flex-1 flex-col items-start gap-4 py-20">
      <h1 className="heading-1">{dict.errors.notFoundTitle}</h1>
      <p className="text-ink-muted">{dict.errors.notFoundBody}</p>
      <ButtonLink href={localePath(locale, "/shop")}>{dict.shop.browseAll}</ButtonLink>
    </main>
  );
}
