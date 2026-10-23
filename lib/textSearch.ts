// Letters that Unicode NFD decomposition doesn't break into base-letter + accent,
// so they need an explicit mapping before the generic diacritic strip below.
const SPECIAL_LETTER_MAP: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  đ: "d",
  ð: "d",
  þ: "th",
  ł: "l",
  ı: "i",
};

/** Lowercase, map Nordic/special letters to ASCII, then strip combining accents (é→e, š→s, ñ→n, ...). */
export function normalizeSearchText(input: string): string {
  const lower = input.toLowerCase();
  const mapped = [...lower].map((ch) => SPECIAL_LETTER_MAP[ch] ?? ch).join("");
  return mapped.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Diacritic-insensitive substring match — "Odegaard" finds "Ødegaard", "Sesko" finds "Šeško". */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeSearchText(query).trim();
  if (!q) return true;
  return normalizeSearchText(text).includes(q);
}
