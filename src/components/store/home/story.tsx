import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionary";
import { homeImagery } from "@/config/home";

/**
 * How personalising works, on the page's one dark band (tonal contrast after
 * the light product sections). Numbered because it IS a sequence.
 */
export function PersonalisationStory({ t }: { t: Dictionary["home"] }) {
  return (
    <section className="bg-ink text-on-ink" aria-labelledby="home-story">
      <div className="gutter mx-auto grid max-w-wide gap-10 py-16 md:grid-cols-2 md:items-center md:gap-10 lg:gap-20 lg:py-28">
        <div className="relative aspect-[4/3] overflow-hidden rounded-image">
          <Image src={homeImagery.story.src} alt={t.storyAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <h2 id="home-story" className="heading-1">
            {t.storyTitle}
          </h2>
          <p className="mt-4 max-w-[44ch] text-lg text-on-ink-muted">{t.storyBody}</p>
          <ol className="mt-10 flex flex-col">
            {t.steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-3 border-t border-on-ink/15 py-6">
                <span className="font-serif text-h2 leading-none text-tissue" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-lg">{s.title}</span>
                  <span className="text-on-ink-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
