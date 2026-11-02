import { notFound } from "next/navigation";

// Any unknown storefront path renders the localized 404.
export default function Missing() {
  notFound();
}
