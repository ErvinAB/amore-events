/* A. Editorial Minimalism — white, charcoal, type scale as the one bold move. */
import Image from "next/image";
import type { LabData } from "./data";

const C = { bg: "#FFFFFF", ink: "#1F1D1B", muted: "#6F6A66", line: "#E7E3DE", well: "#F4F2EF" };

export function ConceptA({ data }: { data: LabData }) {
  return (
    <div style={{ background: C.bg, color: C.ink }} className="min-h-dvh font-sans">
      <header className="border-b" style={{ borderColor: C.line }}>
        <div className="mx-auto flex max-w-[90rem] flex-col items-center gap-3 px-4 pt-6 pb-3 lg:px-8">
          <div className="flex w-full items-center justify-between lg:justify-center">
            <span className="text-sm lg:absolute lg:left-8" style={{ color: C.muted }}>Menu</span>
            <span className="font-serif text-2xl font-light tracking-[0.02em] lg:text-3xl">Gift Store</span>
            <span className="text-sm lg:absolute lg:right-8">Bag (2)</span>
          </div>
          <nav className="hidden gap-8 text-[13px] lg:flex" style={{ color: C.muted }}>
            {["Shop all", ...data.categories.map((c) => c.name)].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </nav>
        </div>
      </header>

      <section>
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/8]">
          <Image src="/dev-imagery/hero-tall.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-10 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-16">
          <h1 className="font-serif text-[2.6rem] leading-[1.05] font-light tracking-[-0.02em] lg:text-[4.5rem]">
            Gifts that carry
            <br />
            their name
          </h1>
          <div className="flex flex-col justify-end gap-6 lg:pb-3">
            <p className="max-w-[38ch] text-lg" style={{ color: C.muted }}>
              Jewellery, keepsakes and home pieces, personalised with the names, dates and words that matter to you.
            </p>
            <span className="self-start border-b pb-1 text-base" style={{ borderColor: C.ink }}>
              Browse the gifts
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-4 pb-16 lg:px-8">
        <p className="mb-4 text-sm" style={{ color: C.muted }}>Shop by category</p>
        <ul className="border-t" style={{ borderColor: C.line }}>
          {data.categories.map((c) => (
            <li key={c.slug} className="flex items-center justify-between border-b py-4 lg:py-6" style={{ borderColor: C.line }}>
              <span className="font-serif text-2xl font-light lg:text-5xl">{c.name}</span>
              {c.image ? (
                <span className="relative h-16 w-12 shrink-0 overflow-hidden lg:h-24 lg:w-20">
                  <Image src={c.image} alt="" fill sizes="80px" className="object-cover" />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[90rem] px-4 pb-20 lg:px-8">
        <p className="mb-6 text-sm" style={{ color: C.muted }}>Chosen for gifting</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-8">
          {data.products.map((p) => (
            <li key={p.slug} className="flex flex-col gap-3">
              <div className="relative aspect-[4/5]" style={{ background: C.well }}>
                {p.image ? <Image src={p.image} alt="" fill sizes="33vw" className="object-cover" /> : null}
              </div>
              <div className="flex flex-col justify-between gap-1 text-sm lg:flex-row lg:text-base">
                <span>{p.name}</span>
                <span style={{ color: C.muted }}>
                  {p.price} {p.was ? <s className="ml-1 text-xs">{p.was}</s> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Specimen
        colors={[["Paper", C.bg], ["Ink", C.ink], ["Muted", C.muted], ["Line", C.line], ["Well", C.well]]}
        heading="font-serif font-light tracking-[-0.02em]"
        primary={<span className="inline-flex min-h-12 items-center px-7 text-sm text-white" style={{ background: C.ink }}>Add to bag</span>}
        secondary={<span className="inline-flex min-h-12 items-center border px-7 text-sm" style={{ borderColor: C.ink }}>Personalise</span>}
        line={C.line}
        muted={C.muted}
      />
    </div>
  );
}

export function Specimen({
  colors,
  heading,
  primary,
  secondary,
  line,
  muted,
}: {
  colors: [string, string][];
  heading: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  line: string;
  muted: string;
}) {
  return (
    <section className="border-t" style={{ borderColor: line }}>
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="mb-4 text-sm" style={{ color: muted }}>Type</p>
          <p className={`${heading} text-5xl`}>Aa Ѓѓ Ëë</p>
          <p className={`${heading} mt-3 text-3xl`}>Make it yours</p>
          <p className="mt-3 text-base">Onest body text — Подароци што го носат нивното име. Dhurata që mbajnë emrin e tyre.</p>
        </div>
        <div>
          <p className="mb-4 text-sm" style={{ color: muted }}>Colour</p>
          <ul className="grid grid-cols-5 gap-2">
            {colors.map(([n, v]) => (
              <li key={n} className="text-xs">
                <span className="mb-1 block aspect-square border" style={{ background: v, borderColor: line }} />
                {n}
                <br />
                <span style={{ color: muted }}>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-sm" style={{ color: muted }}>Buttons</p>
          <div className="flex flex-wrap gap-3">
            {primary}
            {secondary}
          </div>
        </div>
      </div>
    </section>
  );
}
