import { getImageProps } from "next/image";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { homeImagery } from "@/config/home";
import { ButtonLink } from "@/components/ui/button";
import { GiftTag } from "../gift-tag";

/**
 * Asymmetric split hero. Art-directed image: tall 4:5 crop on phones,
 * wide crop on desktop (one <picture>, so only one image downloads).
 */
export function HomeHero({ locale, t }: { locale: Locale; t: Dictionary["home"] }) {
  const common = { alt: t.heroAlt, priority: true, sizes: "(min-width: 1024px) 58vw, 100vw" } as const;
  const { props: wide } = getImageProps({ ...common, ...homeImagery.heroWide, quality: 85 });
  const {
    props: { srcSet: tallSrcSet, ...tall },
  } = getImageProps({ ...common, ...homeImagery.heroTall, quality: 85 });

  return (
    <section className="mx-auto grid max-w-wide lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16 lg:px-8 lg:py-14">
      <div className="relative order-1 lg:order-2">
        <picture>
          <source media="(min-width: 1024px)" srcSet={wide.srcSet} sizes={wide.sizes} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is in `tall` */}
          <img {...tall} srcSet={tallSrcSet} className="aspect-[4/5] w-full object-cover lg:aspect-[16/10] lg:rounded-image" />
        </picture>
        <div className="absolute top-5 left-0 lg:top-auto lg:bottom-10 lg:-left-6">
          <GiftTag>{t.heroTag}</GiftTag>
        </div>
      </div>
      <div className="gutter order-2 flex flex-col gap-6 py-10 lg:order-1 lg:px-0 lg:py-0">
        <h1 className="heading-display max-w-[14ch]">{t.heroTitle}</h1>
        <p className="max-w-[42ch] text-lg text-ink-muted">{t.heroBody}</p>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <ButtonLink href={localePath(locale, "/shop")}>{t.heroCta}</ButtonLink>
          <a
            href={localePath(locale, "/category/personalised-gifts")}
            className="inline-flex min-h-touch items-center border-b border-taupe text-base hover:border-ink"
          >
            {t.heroSecondary}
          </a>
        </div>
      </div>
    </section>
  );
}
