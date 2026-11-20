import "server-only";
import { createClient } from "@/lib/supabase/server";
import { levelByCode, settingsOf, type PracticeKind } from "@/features/practice/model";
import { withImages } from "@/features/practice/queries";

/** Token shape accepted by get_public_activity (D35). */
export const GUEST_TOKEN = /^[A-Za-z0-9_-]{16,40}$/;

type Raw = {
  activity: {
    id: string;
    kind: PracticeKind;
    title_en: string;
    title_vi: string;
    content: unknown;
    settings: unknown;
  };
  topic: { id: string; title_en: string; title_vi: string; emoji: string | null; level: string };
  words: { word: string; meaning_vi: string; emoji: string | null; image_path?: string | null }[];
};

/** The activity behind a live guest link, or null (link off, unknown, or unpublished). */
export async function getPublicActivity(token: string) {
  if (!GUEST_TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_activity", { p_token: token });
  if (error || !data) return null;
  const raw = data as Raw;
  const level = levelByCode(raw.topic.level);
  if (!level) return null;
  return {
    id: raw.activity.id,
    kind: raw.activity.kind,
    titleEn: raw.activity.title_en,
    titleVi: raw.activity.title_vi,
    content: raw.activity.content,
    settings: settingsOf(raw.activity.settings),
    topic: {
      id: raw.topic.id,
      titleEn: raw.topic.title_en,
      titleVi: raw.topic.title_vi,
      emoji: raw.topic.emoji,
      level,
    },
    words: await withImages(
      raw.words.map((w) => ({
        word: w.word,
        meaningVi: w.meaning_vi,
        emoji: w.emoji,
        imagePath: w.image_path ?? null,
      })),
      { guest: true },
    ),
  };
}
