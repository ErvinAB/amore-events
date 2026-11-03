import { notFound } from "next/navigation";

// Any unknown storefront path renders the localized 404.
export default function Missing() {
  notFound();
}

// Always a 404; nothing to validate for instant navigation.
export const instant = false;
