import { getLocaleAndDictionary } from "@/i18n/server";
import { localePath } from "@/i18n/config";
import { getCategories } from "@/lib/catalog/queries";
import { ButtonLink } from "@/components/ui/button";
import { CategoryNav } from "@/components/store/category-nav";

export default async function NotFound() {
  const [{ locale, dict }, categories] = await Promise.all([getLocaleAndDictionary(), getCategories()]);
  return (
    <main id="main" className="gutter mx-auto flex w-full max-w-content flex-1 flex-col items-start gap-5 py-16 lg:py-24">
      <h1 className="heading-display max-w-[16ch]">{dict.errors.notFoundTitle}</h1>
      <p className="max-w-[44ch] text-lg text-ink-muted">{dict.errors.notFoundBody}</p>
      <ButtonLink href={localePath(locale, "/shop")}>{dict.shop.browseAll}</ButtonLink>
      {categories.length ? (
        <div className="mt-8 flex w-full flex-col gap-4 border-t border-line pt-8">
          <h2 className="heading-3">{dict.errors.notFoundBrowse}</h2>
          <CategoryNav categories={categories} locale={locale} allLabel={dict.shop.all} label={dict.shop.browseCategories} />
        </div>
      ) : null}
    </main>
  );
}
