/* C. Contemporary Artisan — paper texture, italic serif, pinned-print cards. */
import Image from "next/image";
import type { LabData } from "./data";
import { Specimen } from "./concept-a";

const C = { paper: "#EFE7DC", card: "#FAF6F0", ink: "#2B2622", muted: "#6D6158", taupe: "#B79A7F", accent: "#5E4A3D", line: "#D9CCBC" };
const grain =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function ConceptC({ data }: { data: LabData }) {
  return (
    <div style={{ background: `${grain}, ${C.paper}`, color: C.ink }} className="min-h-dvh font-sans">
      <header className="mx-auto flex max-w-[90rem] items-center justify-between px-4 py-5 lg:px-8">
        <span className="text-sm lg:hidden">Menu</span>
        <span className="font-serif text-2xl italic">Gift Store</span>
        <nav className="hidden gap-6 text-sm lg:flex">
          {["Shop all", ...data.categories.map((c) => c.name)].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </nav>
        <span className="text-sm">Bag · 2</span>
      </header>

      <section className="mx-auto max-w-[90rem] px-4 pb-14 lg:px-8">
        <div className="relative aspect-[4/5] border-[10px] sm:aspect-[16/7] lg:border-[14px]" style={{ borderColor: C.card }}>
          <Image src="/dev-imagery/hero-tall.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1 className="font-serif text-[2.6rem] leading-[1.05] italic lg:text-[4rem]">Small things, made to be kept</h1>
          <p className="max-w-[44ch] text-lg" style={{ color: C.muted }}>
            Personalised jewellery, keychains and home pieces with the names and dates that matter.
          </p>
          <span className="inline-flex min-h-12 items-center border-2 px-7 text-base" style={{ borderColor: C.ink }}>
            Browse gifts
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-4 pb-16 lg:px-8">
        <h2 className="mb-8 text-center font-serif text-3xl italic lg:text-4xl">Find something for them</h2>
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-5 lg:gap-6">
          {data.categories.map((c, i) => (
            <li key={c.slug} style={{ transform: `rotate(${[-1.5, 1, -0.5, 1.5, -1][i % 5]}deg)` }}>
              <div className="p-2 pb-3 shadow-[0_1px_2px_rgba(60,40,20,.12)]" style={{ background: C.card }}>
                <div className="relative aspect-square">
                  {c.image ? <Image src={c.image} alt="" fill sizes="20vw" className="object-cover" /> : null}
                </div>
                <p className="mt-2 text-center font-serif italic">{c.name}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[90rem] px-4 pb-16 lg:px-8">
        <h2 className="mb-8 font-serif text-3xl italic">New in the studio</h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {data.products.map((p) => (
            <li key={p.slug} className="border p-2" style={{ background: C.card, borderColor: C.line }}>
              <div className="relative aspect-[4/5]">
                {p.image ? <Image src={p.image} alt="" fill sizes="25vw" className="object-cover" /> : null}
              </div>
              <div className="px-1 pt-3 pb-1">
                <p className="font-serif text-lg leading-snug">{p.name}</p>
                <p className="text-sm" style={{ color: C.muted }}>
                  {p.price} {p.was ? <s className="ml-1">{p.was}</s> : null}
                  {p.personalisable ? <span className="ml-2 italic">· can be personalised</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Specimen
        colors={[["Paper", C.paper], ["Card", C.card], ["Ink", C.ink], ["Taupe", C.taupe], ["Walnut", C.accent]]}
        heading="font-serif italic"
        primary={<span className="inline-flex min-h-12 items-center px-7 text-white" style={{ background: C.accent }}>Add to bag</span>}
        secondary={<span className="inline-flex min-h-12 items-center border-2 px-7" style={{ borderColor: C.ink }}>Personalise</span>}
        line={C.line}
        muted={C.muted}
      />
    </div>
  );
}
