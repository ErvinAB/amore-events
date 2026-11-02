// Macedonian Cyrillic → Latin (common web transliteration). Albanian letters
// ë/ç are folded via Unicode normalisation.
const MK: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ѓ: "gj", е: "e", ж: "zh", з: "z", ѕ: "dz", и: "i", ј: "j",
  к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ќ: "kj",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", џ: "dzh", ш: "sh",
};

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Срце & Ime Ëmri" → "srce-ime-emri". Stable Latin slug for all locales. */
export function slugify(input: string, maxLength = 80): string {
  const lower = input.toLowerCase();
  const translit = Array.from(lower, (ch) => MK[ch] ?? ch).join("");
  return translit
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
