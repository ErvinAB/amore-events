"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/** Swipeable on mobile (scroll-snap), thumbnails on desktop. No library. */
export function Gallery({
  images,
  imageLabelTemplate,
}: {
  images: { src: string; alt: string; width: number | null; height: number | null }[];
  /** e.g. "Image {index} of {total}" */
  imageLabelTemplate: string;
}) {
  const imageLabel = (i: number, total: number) =>
    imageLabelTemplate.replace("{index}", String(i)).replace("{total}", String(total));
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (images.length === 0) return <div className="aspect-[4/5] w-full rounded-image bg-tissue" />;

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          tabIndex={0}
          aria-roledescription="carousel"
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-tissue sm:rounded-image"
              role="group"
              aria-roledescription="slide"
              aria-label={imageLabel(i + 1, images.length)}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {images.map((img, i) => (
              <span key={img.src} className={`size-1.5 rounded-full ${i === active ? "bg-ink" : "bg-line-strong"}`} />
            ))}
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="hidden w-20 shrink-0 flex-col gap-3 lg:flex">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={imageLabel(i + 1, images.length)}
                aria-current={i === active ? "true" : undefined}
                className={`relative block aspect-[4/5] w-full overflow-hidden rounded-image bg-tissue ring-offset-2 ${i === active ? "ring-1 ring-ink" : "opacity-80 hover:opacity-100"}`}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
