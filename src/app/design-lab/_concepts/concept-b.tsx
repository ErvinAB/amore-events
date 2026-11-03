/* B. Modern Gift Atelier — warm ivory, blush wells, plum for action only.
   Signature: the gift tag, used ONLY to mark something personalisable. */
import Image from "next/image";
import type { LabData } from "./data";
import { Specimen } from "./concept-a";

const C = {
  ivory: "#F7F3ED",
  blush: "#E9D9D4",
  plum: "#763F50",
  taupe: "#B79A7F",
  ink: "#252321",
  muted: "#6B625C",
  line: "#E4DAD0",
  paper: "#FFFDF9",
};

/** Tag-shaped label: notched top corners + punched hole. Means "personalisable". */
export function GiftTag({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "plum" }) {
  const bg = tone === "plum" ? C.plum : C.paper;
  const fg = tone === "plum" ? "#FFFFFF" : C.ink;
  return (
    <span
      className="inline-flex items-center gap-2 py-1 pr-3 pl-4 text-xs"
      style={{
        background: bg,
        color: fg,
        clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: tone === "plum" ? C.ivory : C.taupe }} />
      {children}
    </span>
  );
}

export function ConceptB({ data }: { data: LabData }) {
  const [big, ...rest] = [
    data.categories.find((c) => c.slug === "jewellery"),
    ...data.categories.filter((c) => c.slug !== "jewellery"),
  ].filter(Boolean) as LabData["categories"];

  return (
    <div style={{ background: C.ivory, color: C.ink }} className="min-h-dvh font-sans">
      <p className="px-4 py-2 text-center text-xs" style={{ background: C.blush, color: C.ink }}>
        Pay in cash when your gift arrives{data.freeFrom ? ` · Free delivery over ${data.freeFrom}` : ""}
      </p>
      <header className="sticky top-0 z-10 border-b" style={{ background: C.ivory, borderColor: C.line }}>
        <div className="mx-auto grid max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center px-4 py-4 lg:grid-cols-[auto_1fr_auto] lg:gap-12 lg:px-8">
          <span className="text-sm lg:hidden">Menu</span>
          <span className="font-serif text-2xl tracking-[-0.01em]">Gift Store</span>
          <nav className="hidden justify-center gap-7 text-sm lg:flex">
            {["Shop all", ...data.categories.map((c) => c.name)].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </nav>
          <span className="justify-self-end text-sm">
            <span className="mr-4 hidden lg:inline" style={{ color: C.muted }}>EN · MK · SQ</span>
            Bag <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] text-white" style={{ background: C.plum }}>2</span>
          </span>
        </div>
      </header>

      {/* Hero: asymmetric split. Mobile: image first, then copy. */}
      <section className="mx-auto grid max-w-[90rem] lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16 lg:px-8 lg:py-14">
        <div className="relative order-1 aspect-[4/5] lg:order-2 lg:aspect-[6/5]">
          <Image src="/dev-imagery/hero-wide.jpg" alt="" fill priority sizes="(min-width:1024px) 58vw, 100vw" className="hidden object-cover lg:block lg:rounded-[4px]" />
          <Image src="/dev-imagery/hero-tall.jpg" alt="" fill priority sizes="100vw" className="object-cover lg:hidden" />
          <div className="absolute bottom-4 left-4 lg:bottom-8 lg:-left-10">
            <GiftTag>Add a name, a date or a few words</GiftTag>
          </div>
        </div>
        <div className="order-2 flex flex-col gap-6 px-4 py-10 lg:order-1 lg:px-0 lg:py-0">
          <h1 className="font-serif text-[2.5rem] leading-[1.08] tracking-[-0.015em] lg:text-[3.6rem]">
            Thoughtful gifts, made personal
          </h1>
          <p className="max-w-[40ch] text-lg" style={{ color: C.muted }}>
            Jewellery, keepsakes and pieces for the home, finished with the names, dates and words that make them theirs.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="inline-flex min-h-12 items-center rounded-full px-7 text-base text-white" style={{ background: C.plum }}>
              Find a gift
            </span>
            <span className="border-b pb-0.5 text-base" style={{ borderColor: C.taupe }}>Personalised gifts</span>
          </div>
        </div>
      </section>

      {/* Categories: one large + four smaller, not five identical cards. */}
      <section className="mx-auto max-w-[90rem] px-4 py-14 lg:px-8 lg:py-20">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl lg:text-4xl">Shop by category</h2>
          <span className="text-sm" style={{ color: C.muted }}>All gifts</span>
        </div>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-2 lg:gap-5">
          {[big, ...rest].map((c, i) => (
            <li key={c.slug} className={i === 0 ? "col-span-2 lg:row-span-2" : ""}>
              <div className={`relative overflow-hidden rounded-[4px] ${i === 0 ? "aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[4/5]"}`} style={{ background: C.blush }}>
                {c.image ? <Image src={c.image} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" /> : null}
                <span className="absolute inset-x-0 bottom-0 p-4 font-serif text-xl lg:text-2xl" style={{ background: "linear-gradient(transparent, rgba(247,243,237,.92) 45%)" }}>
                  {c.name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-[90rem] px-4 pb-16 lg:px-8">
        <h2 className="mb-8 font-serif text-3xl lg:text-4xl">Chosen for gifting</h2>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {data.products.map((p) => (
            <li key={p.slug} className="flex flex-col gap-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px]" style={{ background: C.blush }}>
                {p.image ? <Image src={p.image} alt="" fill sizes="25vw" className="object-cover" /> : null}
                {p.personalisable ? (
                  <span className="absolute top-3 left-0">
                    <GiftTag>Personalise</GiftTag>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-snug">{p.name}</span>
                <span className="text-[15px]">
                  {p.was ? <span style={{ color: C.plum }}>{p.price}</span> : p.price}
                  {p.was ? <s className="ml-2 text-sm" style={{ color: C.muted }}>{p.was}</s> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Personalisation story: a real 3-step sequence. */}
      <section style={{ background: C.paper }}>
        <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[4px]">
            <Image src="/dev-imagery/story-detail.jpg" alt="" fill sizes="50vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-serif text-3xl lg:text-[2.6rem] lg:leading-tight">A gift with their name on it</h2>
            <p className="mt-4 max-w-[44ch]" style={{ color: C.muted }}>
              Choose a piece, tell us the words, and we’ll make it theirs. You pay when it reaches your door.
            </p>
            <ol className="mt-8 flex flex-col gap-5">
              {[
                ["Choose a piece", "Jewellery, keychains and gifts for the home."],
                ["Make it yours", "Add a name, a date or a short message."],
                ["Pay on delivery", "Cash to the courier. No card needed."],
              ].map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t pt-5" style={{ borderColor: C.line }}>
                  <span className="font-serif text-2xl" style={{ color: C.plum }}>{i + 1}</span>
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="text-sm" style={{ color: C.muted }}>{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Specimen
        colors={[["Ivory", C.ivory], ["Blush", C.blush], ["Plum", C.plum], ["Taupe", C.taupe], ["Charcoal", C.ink]]}
        heading="font-serif tracking-[-0.015em]"
        primary={<span className="inline-flex min-h-12 items-center rounded-full px-7 text-white" style={{ background: C.plum }}>Add to bag</span>}
        secondary={<span className="inline-flex min-h-12 items-center rounded-full border px-7" style={{ borderColor: C.ink }}>View bag</span>}
        line={C.line}
        muted={C.muted}
      />
    </div>
  );
}
