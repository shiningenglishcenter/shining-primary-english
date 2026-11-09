import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Admin reads for classes; callers must have run requireRole("admin"). */

export type Level = { id: string; code: string; name: string };

export async function listLevels(): Promise<Level[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("id, code, name")
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`listLevels: ${error.code}`);
  return (data ?? []) as Level[];
}

export type ClassListItem = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  isActive: boolean;
  studentCount: number;
  teachers: string[];
};

type Profile = { full_name: string } | null;

export async function listClasses(): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, code, name, is_active, level:levels!classes_primary_level_id_fkey(name), class_students(left_at), teacher_classes(unassigned_at, teacher:teachers(profile:profiles(full_name)))",
    )
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(`listClasses: ${error.code}`);
  return (data ?? []).map((c) => {
    const students = (c.class_students ?? []) as unknown as { left_at: string | null }[];
    const teachers = (c.teacher_classes ?? []) as unknown as {
      unassigned_at: string | null;
      teacher: { profile: Profile } | null;
    }[];
    return {
      id: c.id as string,
      code: c.code as string,
      name: c.name as string,
      level: (c.level as unknown as { name: string } | null)?.name ?? null,
      isActive: c.is_active as boolean,
      studentCount: students.filter((s) => !s.left_at).length,
      teachers: teachers
        .filter((t) => !t.unassigned_at && t.teacher?.profile)
        .map((t) => t.teacher!.profile!.full_name),
    };
  });
}

/** Active classes for pickers (e.g. "add to class" on the new-student form). */
export async function listOpenClasses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, code")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`listOpenClasses: ${error.code}`);
  return (data ?? []) as { id: string; name: string; code: string }[];
}

export async function getClass(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, code, name, is_active, primary_level_id, class_students(enrolled_at, left_at, student:students(id, student_code, full_name, english_name, status, deleted_at)), teacher_classes(role, unassigned_at, teacher:teachers(id, deleted_at, profile:profiles(full_name, is_active)))",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;

  const enrolments = (data.class_students ?? []) as unknown as {
    enrolled_at: string;
    left_at: string | null;
    student: {
      id: string;
      student_code: string;
      full_name: string;
      english_name: string | null;
      status: string;
      deleted_at: string | null;
    } | null;
  }[];
  const assignments = (data.teacher_classes ?? []) as unknown as {
    role: "main" | "assistant";
    unassigned_at: string | null;
    teacher: {
      id: string;
      deleted_at: string | null;
      profile: { full_name: string; is_active: boolean } | null;
    } | null;
  }[];

  return {
    id: data.id as string,
    code: data.code as string,
    name: data.name as string,
    isActive: data.is_active as boolean,
    levelId: (data.primary_level_id as string | null) ?? null,
    students: enrolments
      .filter((e) => !e.left_at && e.student && !e.student.deleted_at)
      .map((e) => ({
        id: e.student!.id,
        code: e.student!.student_code,
        fullName: e.student!.full_name,
        englishName: e.student!.english_name,
        enrolledAt: e.enrolled_at,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi")),
    teachers: assignments
      .filter((a) => !a.unassigned_at && a.teacher && !a.teacher.deleted_at && a.teacher.profile)
      .map((a) => ({ id: a.teacher!.id, fullName: a.teacher!.profile!.full_name, role: a.role })),
  };
}

/** Students who can still be added to the class (active, not already in it). */
export async function listEnrolCandidates(classId: string, enrolledIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, student_code, full_name, english_name")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("full_name")
    .limit(500);
  if (error) throw new Error(`listEnrolCandidates(${classId}): ${error.code}`);
  const taken = new Set(enrolledIds);
  return (data ?? []).filter((s) => !taken.has(s.id as string)) as {
    id: string;
    student_code: string;
    full_name: string;
    english_name: string | null;
  }[];
}

export async function listTeacherOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id, profile:profiles!inner(full_name, is_active)")
    .is("deleted_at", null);
  if (error) throw new Error(`listTeacherOptions: ${error.code}`);
  return (data ?? [])
    .map((t) => {
      const p = t.profile as unknown as { full_name: string; is_active: boolean };
      return { id: t.id as string, fullName: p.full_name, isActive: p.is_active };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
}
