import "server-only";
import { createClient } from "@/lib/supabase/server";
import { withImages } from "@/features/practice/queries";
import type { VocabWord } from "@/features/practice/model";

/**
 * "Ôn lại từ hay sai" (ARCHITECTURE D64): the words a pupil missed in the
 * last two weeks, read from their own rounds' details (D32). RLS lets a
 * pupil read only their own progress records.
 */

const DAYS = 14;
const MAX_WORDS = 10;
/** Question types whose label is one word (match labels list several, so they are left out). */
const WORD_QUESTIONS = new Set(["listen_choose", "look_choose", "spell", "listen_type", "flash"]);

type Detail = { t?: string; q?: string; p?: number; x?: number };

export async function missedWords(): Promise<string[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const { data } = await supabase
    .from("progress_records")
    .select("details")
    .gte("recorded_at", since)
    .not("details", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(80);
  const misses = new Map<string, number>();
  for (const row of data ?? []) {
    for (const d of (row.details as Detail[] | null) ?? []) {
      if (!d.t || !d.q || !WORD_QUESTIONS.has(d.t)) continue;
      const full = d.x ?? 2;
      if ((d.p ?? full) >= full) continue;
      const word = d.q.trim().toLowerCase();
      misses.set(word, (misses.get(word) ?? 0) + 1);
    }
  }
  return [...misses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_WORDS)
    .map(([w]) => w);
}

/** The missed words as cards, plus a few other words of the same levels for the wrong choices. */
export async function reviewWords(words: string[]): Promise<{ words: VocabWord[]; targets: string[] }> {
  if (!words.length) return { words: [], targets: [] };
  const supabase = await createClient();
  const { data } = await supabase
    .from("vocabulary")
    .select("word, meaning_vi, emoji, image_path, ipa, level_id")
    .eq("status", "published")
    .is("deleted_at", null)
    .in("word", [...words, ...words.map((w) => w[0]!.toUpperCase() + w.slice(1))])
    .limit(60);
  const found = new Map<string, NonNullable<typeof data>[number]>();
  for (const row of data ?? []) {
    const key = (row.word as string).toLowerCase();
    if (!found.has(key)) found.set(key, row);
  }
  const levels = [...new Set([...found.values()].map((r) => r.level_id as string))];
  const { data: others } = levels.length
    ? await supabase
        .from("vocabulary")
        .select("word, meaning_vi, emoji, image_path, ipa, level_id")
        .eq("status", "published")
        .is("deleted_at", null)
        .in("level_id", levels)
        .not("emoji", "is", null)
        .limit(40)
    : { data: [] };
  const rows = [
    ...found.values(),
    ...(others ?? []).filter((o) => !found.has((o.word as string).toLowerCase())),
  ];
  const cards = await withImages(
    rows.map((r) => ({
      word: r.word as string,
      meaningVi: r.meaning_vi as string,
      emoji: (r.emoji as string | null) ?? null,
      imagePath: (r.image_path as string | null) ?? null,
      ipa: (r.ipa as string | null) ?? null,
    })),
  );
  return { words: cards, targets: [...found.values()].map((r) => r.word as string) };
}
