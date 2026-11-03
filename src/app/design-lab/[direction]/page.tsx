import { notFound } from "next/navigation";
import { labData } from "../_concepts/data";
import { ConceptA } from "../_concepts/concept-a";
import { ConceptB } from "../_concepts/concept-b";
import { ConceptC } from "../_concepts/concept-c";

export function generateStaticParams() {
  return [{ direction: "a" }, { direction: "b" }, { direction: "c" }];
}

export default async function Direction({ params }: PageProps<"/design-lab/[direction]">) {
  if (process.env.NODE_ENV === "production" && process.env.DESIGN_LAB !== "1") notFound();
  const { direction } = await params;
  const data = await labData();
  if (direction === "a") return <ConceptA data={data} />;
  if (direction === "b") return <ConceptB data={data} />;
  if (direction === "c") return <ConceptC data={data} />;
  notFound();
}
