/**
 * Development / preview seed data. Every row is labelled [SAMPLE].
 *
 * Creates accounts through the Supabase Auth Admin API (the same path the
 * admin "create account" feature will use), then people, a class and links.
 * Safe to run repeatedly. Refuses to touch a non-local project unless
 * SEED_ALLOW_REMOTE=1 is set — never run it against production.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-dev.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD ?? "Sample-Pass-2026";
const INTERNAL_DOMAIN = "users.shining.internal";

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost"].includes(host) && process.env.SEED_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to seed ${host}. Set SEED_ALLOW_REMOTE=1 for a non-production preview project.`);
  process.exit(1);
}

type Role = "admin" | "teacher" | "student" | "parent";
/**
 * An account signs in EITHER with a centre username (mapped to
 * <username>@users.shining.internal) OR with a real email — never both.
 * `key` only identifies the sample here; it is stored as the profile
 * username only for username accounts.
 */
type SampleAccount = { key: string; email?: string; role: Role; fullName: string; active?: boolean };

const SAMPLE_ACCOUNTS: SampleAccount[] = [
  { key: "admin", email: "admin@example.com", role: "admin", fullName: "[SAMPLE] Quản trị viên" },
  { key: "gv.lan", role: "teacher", fullName: "[SAMPLE] Cô Lan" },
  { key: "gv.minh", role: "teacher", fullName: "[SAMPLE] Thầy Minh" },
  { key: "hs.an", role: "student", fullName: "[SAMPLE] Nguyễn Minh An" },
  { key: "hs.khoa", role: "student", fullName: "[SAMPLE] Trần Đăng Khoa", active: false },
  { key: "ph.an", role: "parent", fullName: "[SAMPLE] Phụ huynh bé An" },
];

const supabase: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function check<T>(label: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function existingUsersByEmail(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email) map.set(u.email, u.id);
    if (data.users.length < 200) return map;
  }
}

async function ensureAccount(a: SampleAccount, existing: Map<string, string>): Promise<string> {
  const email = a.email ?? `${a.key}@${INTERNAL_DOMAIN}`;
  let id = existing.get(email);
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: a.role, full_name: a.fullName, ...(a.email ? {} : { username: a.key }) },
    });
    if (error || !data.user) throw new Error(`createUser ${a.key}: ${error?.message}`);
    id = data.user.id;
  }
  check(
    `profile ${a.key}`,
    await supabase
      .from("profiles")
      .update({ is_active: a.active ?? true })
      .eq("id", id),
  );
  return id;
}

async function upsertOne(
  table: string,
  match: Record<string, unknown>,
  values: Record<string, unknown>,
): Promise<string> {
  let query = supabase.from(table).select("id");
  for (const [k, v] of Object.entries(match)) query = query.eq(k, v as string);
  const found = check(`find ${table}`, await query.maybeSingle()) as { id: string } | null;
  if (found) {
    check(`update ${table}`, await supabase.from(table).update(values).eq("id", found.id));
    return found.id;
  }
  const inserted = check(
    `insert ${table}`,
    await supabase.from(table).insert(values).select("id").single(),
  ) as { id: string };
  return inserted.id;
}

async function main() {
  const existing = await existingUsersByEmail();
  const ids: Record<string, string> = {};
  for (const account of SAMPLE_ACCOUNTS) ids[account.key] = await ensureAccount(account, existing);

  const teacherLan = await upsertOne(
    "teachers",
    { profile_id: ids["gv.lan"] },
    { profile_id: ids["gv.lan"] },
  );
  await upsertOne("teachers", { profile_id: ids["gv.minh"] }, { profile_id: ids["gv.minh"] });

  const studentAn = await upsertOne(
    "students",
    { student_code: "SAMPLE-001" },
    {
      student_code: "SAMPLE-001",
      profile_id: ids["hs.an"],
      full_name: "[SAMPLE] Nguyễn Minh An",
      english_name: "Andy",
      school_grade: 4,
    },
  );
  await upsertOne(
    "students",
    { student_code: "SAMPLE-002" },
    { student_code: "SAMPLE-002", profile_id: ids["hs.khoa"], full_name: "[SAMPLE] Trần Đăng Khoa" },
  );

  const parentAn = await upsertOne(
    "parents",
    { profile_id: ids["ph.an"] },
    { profile_id: ids["ph.an"], full_name: "[SAMPLE] Phụ huynh bé An" },
  );
  check(
    "student_parents",
    await supabase
      .from("student_parents")
      .upsert({ student_id: studentAn, parent_id: parentAn, relationship: "mother", is_primary: true }),
  );

  const classId = await upsertOne(
    "classes",
    { code: "SAMPLE-MOV-A" },
    { code: "SAMPLE-MOV-A", name: "[SAMPLE] Movers A", schedule_note: "Thứ Ba và Thứ Năm, 17:30" },
  );
  check(
    "teacher_classes",
    await supabase
      .from("teacher_classes")
      .upsert({ class_id: classId, teacher_id: teacherLan, role: "main" }),
  );
  check(
    "class_students",
    await supabase.from("class_students").upsert({ class_id: classId, student_id: studentAn }),
  );

  console.warn(
    `Seeded ${SAMPLE_ACCOUNTS.length} [SAMPLE] accounts (password from SEED_PASSWORD or default).`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
