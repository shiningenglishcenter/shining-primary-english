/**
 * Emoji picker search (A1, D42). The index is built at build time by
 * scripts/copy-emoji.mjs from emojibase-data (English + Vietnamese CLDR
 * names and keywords) and served from /emoji/index.json.
 * Row: [code, "english name | keyword | …", "tên tiếng Việt | từ khoá | …"].
 */
export type EmojiRow = [code: string, en: string, vi: string];

export const EMOJI_INDEX_URL = "/emoji/index.json";

/** Lower case, no Vietnamese diacritics ("Con Mèo" → "con meo", "đỏ" → "do"). */
export function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
}

type Prepared = { code: string; name: string; terms: string[]; all: string };

const cache = new WeakMap<EmojiRow[], Prepared[]>();
function prepare(rows: EmojiRow[]): Prepared[] {
  let p = cache.get(rows);
  if (!p) {
    p = rows.map(([code, en, vi]) => {
      const terms = [...en.split("|"), ...vi.split("|")].map(fold).filter(Boolean);
      return { code, name: fold(en.split("|")[0] ?? ""), terms, all: ` ${terms.join(" ")} ` };
    });
    cache.set(rows, p);
  }
  return p;
}

/**
 * Best matches for a query in English or Vietnamese (with or without
 * accents). Every word of the query must appear; exact names and keywords
 * rank first, then word starts, then anywhere. Plural "-s" is tolerated.
 */
export function searchEmoji(rows: EmojiRow[], query: string, limit = 48): string[] {
  const q = fold(query).replace(/\s+/g, " ");
  if (!q) return [];
  const words = q.split(" ");
  const singular = q.length > 3 && q.endsWith("s") ? q.slice(0, -1) : null;
  const scored: { code: string; score: number; i: number }[] = [];
  prepare(rows).forEach((e, i) => {
    let score = 0;
    if (e.name === q || (singular && e.name === singular)) score = 100;
    else if (e.terms.includes(q) || (singular && e.terms.includes(singular))) score = 80;
    else if (words.every((w) => e.all.includes(` ${w}`))) score = 50;
    else if (words.every((w) => e.all.includes(w))) score = 20;
    else if (singular && e.all.includes(` ${singular}`)) score = 40;
    if (score) scored.push({ code: e.code, score: score - Math.min(e.name.length, 30) / 100, i });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.code);
}
