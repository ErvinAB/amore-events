import Image from "next/image";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { homeImagery } from "@/config/home";
import { ButtonLink } from "@/components/ui/button";
import { GiftTag } from "../gift-tag";

/**
 * Split hero. Phones: photo first (4:5), then the words. Tablet and up: the
 * photo fills the right column edge to edge and sets the hero's height.
 * The page's one orchestrated motion: the words rise in, the photo settles.
 */
export function HomeHero({ locale, t }: { locale: Locale; t: Dictionary["home"] }) {
  return (
    <section className="mx-auto grid max-w-wide md:min-h-[min(84svh,52rem)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative order-1 aspect-[4/5] overflow-hidden bg-tissue md:order-2 md:aspect-auto">
        <Image
          src={homeImagery.hero.src}
          alt={t.heroAlt}
          fill
          priority
          quality={85}
          sizes="(min-width: 1440px) 785px, (min-width: 768px) 55vw, 100vw"
          className="animate-settle object-cover"
        />
        <div className="absolute bottom-5 left-0 animate-rise [animation-delay:500ms] lg:bottom-10">
          <GiftTag>{t.heroTag}</GiftTag>
        </div>
      </div>
      <div className="gutter order-2 flex flex-col justify-center gap-7 py-12 md:order-1 md:py-16 md:pr-10 md:pl-8 lg:py-20 lg:pr-14">
        <h1 className="heading-display max-w-[18ch] animate-rise">{t.heroTitle}</h1>
        <p className="max-w-[40ch] animate-rise text-lg text-ink-muted [animation-delay:120ms]">{t.heroBody}</p>
        <div className="flex animate-rise flex-wrap items-center gap-x-7 gap-y-4 [animation-delay:240ms]">
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
