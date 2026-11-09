import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin reads. Every query runs under the signed-in admin's session, so RLS
 * applies; callers must have run requireRole("admin") first.
 */

export const PAGE_SIZE = 50;

/**
 * ILIKE pattern for a search term inside a PostgREST `or=(…)` filter. Drops
 * characters that have meaning in that syntax or in LIKE, so the term can
 * only ever match text.
 */
function likePattern(term: string): string {
  const safe = term
    .replace(/[,()"*\\:%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `%${safe}%`;
}

type ProfileRow = { id: string; username: string | null; is_active: boolean; full_name: string } | null;

export type StudentListItem = {
  id: string;
  code: string;
  fullName: string;
  englishName: string | null;
  status: "active" | "paused" | "left";
  username: string | null;
  hasAccount: boolean;
  accountActive: boolean;
  classes: string[];
};

export async function listStudents(opts: { q?: string; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  let query = supabase
    .from("students")
    .select(
      "id, student_code, full_name, english_name, status, profile:profiles(id, username, is_active, full_name), class_students(left_at, class:classes(name, deleted_at))",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("full_name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const q = opts.q?.trim().slice(0, 60);
  if (q) {
    const p = likePattern(q);
    query = query.or(`full_name.ilike.${p},english_name.ilike.${p},student_code.ilike.${p}`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`listStudents: ${error.code}`);

  const items: StudentListItem[] = (data ?? []).map((s) => {
    const profile = s.profile as unknown as ProfileRow;
    const enrolments = (s.class_students ?? []) as unknown as {
      left_at: string | null;
      class: { name: string; deleted_at: string | null } | null;
    }[];
    return {
      id: s.id as string,
      code: s.student_code as string,
      fullName: s.full_name as string,
      englishName: (s.english_name as string | null) ?? null,
      status: s.status as StudentListItem["status"],
      username: profile?.username ?? null,
      hasAccount: Boolean(profile),
      accountActive: profile?.is_active ?? false,
      classes: enrolments
        .filter((e) => !e.left_at && e.class && !e.class.deleted_at)
        .map((e) => e.class!.name)
        .sort(),
    };
  });
  return { items, total: count ?? 0, page, pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)) };
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, student_code, full_name, english_name, school_name, school_grade, status, created_at, profile:profiles(id, username, is_active, full_name), class_students(enrolled_at, left_at, class:classes(id, name, code, deleted_at))",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const enrolments = (data.class_students ?? []) as unknown as {
    enrolled_at: string;
    left_at: string | null;
    class: { id: string; name: string; code: string; deleted_at: string | null } | null;
  }[];
  return {
    id: data.id as string,
    code: data.student_code as string,
    fullName: data.full_name as string,
    englishName: (data.english_name as string | null) ?? null,
    schoolName: (data.school_name as string | null) ?? null,
    schoolGrade: (data.school_grade as number | null) ?? null,
    status: data.status as StudentListItem["status"],
    profile: data.profile as unknown as ProfileRow,
    classes: enrolments
      .filter((e) => !e.left_at && e.class && !e.class.deleted_at)
      .map((e) => ({ id: e.class!.id, name: e.class!.name, code: e.class!.code })),
  };
}

export type TeacherListItem = {
  id: string;
  profileId: string;
  fullName: string;
  phone: string | null;
  username: string | null;
  accountActive: boolean;
  classes: string[];
};

export async function listTeachers(): Promise<TeacherListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select(
      "id, phone, profile:profiles!inner(id, full_name, username, is_active), teacher_classes(unassigned_at, class:classes(name, deleted_at))",
    )
    .is("deleted_at", null);
  if (error) throw new Error(`listTeachers: ${error.code}`);
  return (data ?? [])
    .map((t) => {
      const profile = t.profile as unknown as NonNullable<ProfileRow>;
      const assignments = (t.teacher_classes ?? []) as unknown as {
        unassigned_at: string | null;
        class: { name: string; deleted_at: string | null } | null;
      }[];
      return {
        id: t.id as string,
        profileId: profile.id,
        fullName: profile.full_name,
        phone: (t.phone as string | null) ?? null,
        username: profile.username,
        accountActive: profile.is_active,
        classes: assignments
          .filter((a) => !a.unassigned_at && a.class && !a.class.deleted_at)
          .map((a) => a.class!.name)
          .sort(),
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
}

export async function getTeacher(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select(
      "id, phone, profile:profiles!inner(id, full_name, username, is_active), teacher_classes(role, unassigned_at, class:classes(id, name, code, deleted_at))",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const profile = data.profile as unknown as NonNullable<ProfileRow>;
  const assignments = (data.teacher_classes ?? []) as unknown as {
    role: "main" | "assistant";
    unassigned_at: string | null;
    class: { id: string; name: string; code: string; deleted_at: string | null } | null;
  }[];
  return {
    id: data.id as string,
    phone: (data.phone as string | null) ?? null,
    profile,
    classes: assignments
      .filter((a) => !a.unassigned_at && a.class && !a.class.deleted_at)
      .map((a) => ({ id: a.class!.id, name: a.class!.name, code: a.class!.code, role: a.role })),
  };
}
