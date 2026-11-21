import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminLevel = {
  id: string;
  code: string;
  slug: string;
  name: string;
  short: string;
  sortOrder: number;
  status: "draft" | "published";
  topics: number;
};
export type AdminProgram = {
  id: string;
  code: string;
  name: string;
  topicNoun: "topic" | "unit";
  sortOrder: number;
  status: "draft" | "published";
  levels: AdminLevel[];
};

/** Every programme and level, drafts included, for /admin/programs (D55). Empty before 0033. */
export async function listProgramsForAdmin(): Promise<AdminProgram[]> {
  const supabase = await createClient();
  const [programs, levels] = await Promise.all([
    supabase.from("programs").select("id, code, name, topic_noun, sort_order, status").is("deleted_at", null),
    supabase
      .from("levels")
      .select("id, code, slug, name, short_name, sort_order, status, program_id, topics(id, deleted_at)")
      .is("deleted_at", null),
  ]);
  if (programs.error || levels.error) return [];
  const lv = (levels.data ?? []).map((l) => ({
    programId: l.program_id as string | null,
    level: {
      id: l.id as string,
      code: l.code as string,
      slug: (l.slug as string | null) ?? "",
      name: l.name as string,
      short: (l.short_name as string | null) ?? (l.name as string),
      sortOrder: l.sort_order as number,
      status: l.status as AdminLevel["status"],
      topics: ((l.topics ?? []) as { deleted_at: string | null }[]).filter((t) => !t.deleted_at).length,
    },
  }));
  return (programs.data ?? [])
    .map((p) => ({
      id: p.id as string,
      code: p.code as string,
      name: p.name as string,
      topicNoun: p.topic_noun as AdminProgram["topicNoun"],
      sortOrder: p.sort_order as number,
      status: p.status as AdminProgram["status"],
      levels: lv
        .filter((x) => x.programId === p.id)
        .map((x) => x.level)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
