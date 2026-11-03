import Link from "next/link";
import { notFound } from "next/navigation";

export default function DesignLabIndex() {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_LAB !== "1") notFound();
  return (
    <main className="mx-auto max-w-xl p-10 font-sans">
      <h1 className="heading-1 mb-6">V0.25 visual explorations</h1>
      <ul className="flex flex-col gap-3 text-lg underline">
        <li><Link href="/design-lab/a">A. Editorial Minimalism</Link></li>
        <li><Link href="/design-lab/b">B. Modern Gift Atelier</Link></li>
        <li><Link href="/design-lab/c">C. Contemporary Artisan</Link></li>
      </ul>
    </main>
  );
}
