import Image from "next/image";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { homeImagery } from "@/config/home";
import { ButtonLink } from "@/components/ui/button";
import { GiftTag } from "../gift-tag";

/**
 * Split hero. Phones: photo first (4:5), then the words. Desktop: the photo
 * fills the right column edge to edge and sets the hero's height.
 */
export function HomeHero({ locale, t }: { locale: Locale; t: Dictionary["home"] }) {
  return (
    <section className="mx-auto grid max-w-wide lg:min-h-[min(84svh,52rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative order-1 aspect-[4/5] bg-tissue lg:order-2 lg:aspect-auto">
        <Image
          src={homeImagery.hero.src}
          alt={t.heroAlt}
          fill
          priority
          quality={85}
          sizes="(min-width: 1440px) 785px, (min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
        <div className="absolute bottom-5 left-0 lg:bottom-10">
          <GiftTag>{t.heroTag}</GiftTag>
        </div>
      </div>
      <div className="gutter order-2 flex flex-col justify-center gap-7 py-12 lg:order-1 lg:py-20 lg:pr-14 lg:pl-8">
        <h1 className="heading-display max-w-[18ch]">{t.heroTitle}</h1>
        <p className="max-w-[40ch] text-lg text-ink-muted">{t.heroBody}</p>
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
