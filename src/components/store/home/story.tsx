import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionary";
import { homeImagery } from "@/config/home";

/** How personalising works. Numbered because it IS a sequence. */
export function PersonalisationStory({ t }: { t: Dictionary["home"] }) {
  return (
    <section className="bg-surface" aria-labelledby="home-story">
      <div className="gutter mx-auto grid max-w-wide gap-10 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
        <div className="relative aspect-[4/3] overflow-hidden rounded-image bg-tissue">
          <Image src={homeImagery.story.src} alt={t.storyAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <h2 id="home-story" className="heading-1">
            {t.storyTitle}
          </h2>
          <p className="mt-4 max-w-[44ch] text-ink-muted">{t.storyBody}</p>
          <ol className="mt-8 flex flex-col">
            {t.steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-line py-5">
                <span className="font-serif text-h3 text-ribbon" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium">{s.title}</span>
                  <span className="text-sm text-ink-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
