import { Onest, Spectral } from "next/font/google";

// Both families cover Latin Extended (Albanian ë, ç) and Cyrillic (Macedonian).
export const spectral = Spectral({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

export const onest = Onest({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});
