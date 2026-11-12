import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BarChart3, Star } from "lucide-react";
import { z } from "zod";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTable, PageHeader, td, th } from "@/components/shell/page-parts";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { KIND_LABEL_VI, levelBySlug, PRACTICE_LEVELS } from "@/features/practice/model";
import {
  classStudents,
  getStudent,
  listResultClasses,
  practiceRecords,
  type ActivityInfo,
} from "@/features/results/queries";
import {
  INACTIVE_DAYS,
  LOW_AVERAGE,
  latestByActivity,
  summariseActivities,
  summariseStudents,
  type StudentSummary,
} from "@/features/results/summary";
import { cn } from "@/lib/utils";

/**
 * Results pages (D29), shared by /teacher/results and /admin/results.
 * Filters live in the URL so a teacher can bookmark or share a view.
 */
export type ResultsBase = "/teacher/results" | "/admin/results";
const roleOf = (base: ResultsBase) => (base === "/admin/results" ? "admin" : "teacher");

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const PERIODS = [
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "all", label: "Tất cả" },
] as const;
const SORTS = ["name", "done", "stars", "avg", "last"] as const;
type Sort = (typeof SORTS)[number];

function filtersOf(sp: Search) {
  const days = PERIODS.find((p) => p.value === one(sp.days))?.value ?? "30";
  const levelSlug = one(sp.level);
  const level =
    levelSlug && PRACTICE_LEVELS.some((l) => l.slug === levelSlug) ? levelBySlug(levelSlug) : null;
  const sort: Sort = SORTS.find((s) => s === one(sp.sort)) ?? "name";
  const view = one(sp.view) === "activities" ? "activities" : "students";
  const since = days === "all" ? null : new Date(Date.now() - Number(days) * 86_400_000).toISOString();
  return { days, level, sort, view, since } as const;
}

const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "Chưa làm");

function scoreTone(r: number | null) {
  if (r === null) return "text-ink-soft";
  if (r >= 0.8) return "text-leaf";
  if (r < LOW_AVERAGE) return "text-berry";
  return "text-ink";
}

// ------------------------------------------------------------- class view ---

export async function ResultsHome({
  base,
  searchParams,
}: {
  base: ResultsBase;
  searchParams: Promise<Search>;
}) {
  await requireRole(roleOf(base));
  const [sp, classes] = await Promise.all([searchParams, listResultClasses()]);
  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Kết quả học sinh" />
        <EmptyState icon={BarChart3} title="Chưa có lớp nào">
          {base === "/teacher/results"
            ? "Khi quản trị viên xếp bạn vào lớp, kết quả luyện tập của học sinh sẽ hiện ở đây."
            : "Tạo lớp và thêm học sinh để xem kết quả."}
        </EmptyState>
      </>
    );
  }
  const f = filtersOf(sp);
  const cls = classes.find((c) => c.id === one(sp.class)) ?? classes[0]!;
  const students = await classStudents(cls.id);
  const { records, activities } = await practiceRecords(
    students.map((s) => s.id),
    f.since,
    f.level?.code ?? null,
  );

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({
      class: cls.id,
      days: f.days,
      ...(f.level ? { level: f.level.slug } : {}),
      sort: f.sort,
      view: f.view,
    });
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `${base}?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Kết quả học sinh"
        description="Bài luyện học sinh đã làm. Điểm và sao lấy theo lần làm gần nhất của mỗi bài."
      />

      <form
        method="get"
        action={base}
        className="mb-6 flex flex-wrap items-end gap-3"
        data-testid="results-filters"
      >
        <input type="hidden" name="sort" value={f.sort} />
        <input type="hidden" name="view" value={f.view} />
        <FilterSelect label="Lớp" name="class" value={cls.id}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Thời gian" name="days" value={f.days}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Trình độ" name="level" value={f.level?.slug ?? ""}>
          <option value="">Tất cả trình độ</option>
          {PRACTICE_LEVELS.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </FilterSelect>
        <button
          type="submit"
          className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
        >
          Xem
        </button>
      </form>

      <nav aria-label="Cách xem" className="mb-4 flex gap-2">
        {(
          [
            ["students", "Theo học sinh"],
            ["activities", "Theo bài"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={href({ view: v })}
            aria-current={f.view === v ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              f.view === v ? "border-ink bg-ink text-white" : "border-line bg-surface hover:bg-muted",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {students.length === 0 ? (
        <p className="text-ink-soft">Lớp này chưa có học sinh.</p>
      ) : f.view === "students" ? (
        <StudentsTable
          base={base}
          students={students}
          summaries={summariseStudents(
            students.map((s) => s.id),
            records,
          )}
          sort={f.sort}
          sortHref={(sort) => href({ sort })}
          detailQuery={href({}).split("?")[1] ?? ""}
        />
      ) : (
        <ActivitiesTable classSize={students.length} records={records} activities={activities} />
      )}
    </>
  );
}

function FilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-10 min-w-40 rounded-md border border-line bg-surface px-3 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function StudentsTable({
  base,
  students,
  summaries,
  sort,
  sortHref,
  detailQuery,
}: {
  base: ResultsBase;
  students: { id: string; code: string; name: string }[];
  summaries: StudentSummary[];
  sort: Sort;
  sortHref: (s: Sort) => string;
  detailQuery: string;
}) {
  const byId = new Map(summaries.map((s) => [s.studentId, s]));
  const rows = students.map((st) => ({ st, sum: byId.get(st.id)! }));
  const desc = (a: number, b: number) => b - a;
  rows.sort((a, b) => {
    switch (sort) {
      case "done":
        return desc(a.sum.done, b.sum.done);
      case "stars":
        return desc(a.sum.stars, b.sum.stars);
      case "avg":
        return desc(a.sum.average ?? -1, b.sum.average ?? -1);
      case "last":
        return (b.sum.lastAt ?? "").localeCompare(a.sum.lastAt ?? "");
      default:
        return a.st.name.localeCompare(b.st.name, "vi");
    }
  });
  const flagged = rows.filter((r) => r.sum.needsSupport).length;
  const head = (key: Sort, label: string) => (
    <th className={th}>
      <Link
        href={sortHref(key)}
        className={cn("hover:underline", sort === key && "text-ink underline")}
        aria-sort={sort === key ? (key === "name" ? "ascending" : "descending") : undefined}
      >
        {label}
      </Link>
    </th>
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {rows.length} học sinh ·{" "}
        <span className={flagged ? "font-semibold text-berry" : undefined}>{flagged} cần chú ý</span> (không
        làm bài {INACTIVE_DAYS} ngày, hoặc điểm trung bình dưới {LOW_AVERAGE * 100}%)
      </p>
      <DataTable testId="results-students">
        <thead>
          <tr>
            {head("name", "Học sinh")}
            {head("done", "Số bài đã làm")}
            {head("stars", "Sao")}
            {head("avg", "Điểm TB")}
            {head("last", "Lần làm gần nhất")}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ st, sum }) => (
            <tr key={st.id} className="hover:bg-muted/40" data-testid="result-row">
              <td className={td}>
                <Link
                  href={`${base}/students/${st.id}?${detailQuery}`}
                  className="flex items-center gap-2 font-semibold hover:text-sky hover:underline"
                >
                  {sum.needsSupport ? (
                    <AlertTriangle className="size-4 shrink-0 text-berry" aria-label="Cần chú ý" />
                  ) : null}
                  <span>
                    {st.name}
                    <span className="block text-xs font-normal text-ink-soft">{st.code}</span>
                  </span>
                </Link>
              </td>
              <td className={`${td} tabular-nums`}>
                {sum.done}
                {sum.attempts > sum.done ? (
                  <span className="text-xs text-ink-soft"> ({sum.attempts} lượt)</span>
                ) : null}
              </td>
              <td className={`${td} tabular-nums`}>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-sun text-sun" aria-hidden="true" />
                  {sum.stars}
                </span>
              </td>
              <td className={cn(td, "font-semibold tabular-nums", scoreTone(sum.average))}>
                {pct(sum.average)}
              </td>
              <td className={`${td} text-ink-soft`}>{when(sum.lastAt)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

function ActivitiesTable({
  classSize,
  records,
  activities,
}: {
  classSize: number;
  records: Parameters<typeof summariseActivities>[0];
  activities: Map<string, ActivityInfo>;
}) {
  const rows = summariseActivities(records)
    .map((s) => ({ s, a: activities.get(s.activityId)! }))
    .filter((r) => r.a)
    .sort((x, y) => x.a.sortKey.localeCompare(y.a.sortKey));
  if (rows.length === 0)
    return <p className="text-ink-soft">Chưa có học sinh nào làm bài trong khoảng này.</p>;
  return (
    <DataTable testId="results-activities">
      <thead>
        <tr>
          <th className={th}>Chủ đề / Unit</th>
          <th className={th}>Bài</th>
          <th className={th}>Đã làm</th>
          <th className={th}>Điểm TB</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ s, a }) => (
          <tr key={s.activityId} className="hover:bg-muted/40">
            <td className={td}>
              {a.topicEn}
              {a.level ? <span className="block text-xs text-ink-soft">{a.level.name}</span> : null}
            </td>
            <td className={td}>
              {a.titleVi}
              <span className="block text-xs text-ink-soft">{KIND_LABEL_VI[a.kind]}</span>
            </td>
            <td className={`${td} tabular-nums`}>
              {s.students}/{classSize}
            </td>
            <td className={cn(td, "font-semibold tabular-nums", scoreTone(s.average))}>{pct(s.average)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

// ----------------------------------------------------------- student view ---

export async function StudentResults({
  base,
  params,
  searchParams,
}: {
  base: ResultsBase;
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  await requireRole(roleOf(base));
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const f = filtersOf(sp);
  // RLS: null when this teacher does not teach the student.
  const student = await getStudent(id);
  if (!student) notFound();
  const { records, activities } = await practiceRecords([id], f.since, f.level?.code ?? null);
  const [summary] = summariseStudents([id], records);
  const results = [...(latestByActivity(records).get(id)?.values() ?? [])]
    .map((r) => ({ r, a: activities.get(r.activityId)! }))
    .filter((x) => x.a)
    .sort((x, y) => x.a.sortKey.localeCompare(y.a.sortKey));
  const back = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  const period = PERIODS.find((p) => p.value === f.days)!.label.toLowerCase();

  return (
    <>
      <PageHeader
        title={student.name}
        description={`${student.code} · ${period}${f.level ? ` · ${f.level.name}` : ""}`}
        back={{ href: `${base}${back ? `?${back}` : ""}`, label: "Kết quả của lớp" }}
      />
      <ul className="mb-6 grid gap-3 sm:grid-cols-4" data-testid="student-figures">
        {[
          ["Số bài đã làm", String(summary!.done)],
          ["Tổng lượt làm", String(summary!.attempts)],
          ["Sao", String(summary!.stars)],
          ["Điểm trung bình", pct(summary!.average)],
        ].map(([label, value]) => (
          <li key={label} className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </li>
        ))}
      </ul>
      {summary!.needsSupport ? (
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-berry">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Cần chú ý: {summary!.done === 0 || !summary!.lastAt ? "chưa làm bài" : "ít làm bài hoặc điểm thấp"}.
        </p>
      ) : null}
      {results.length === 0 ? (
        <p className="text-ink-soft">Học sinh chưa làm bài nào trong khoảng này.</p>
      ) : (
        <DataTable testId="student-results">
          <thead>
            <tr>
              <th className={th}>Chủ đề / Unit</th>
              <th className={th}>Bài</th>
              <th className={th}>Lần gần nhất</th>
              <th className={th}>Sao</th>
              <th className={th}>Số lượt</th>
              <th className={th}>Ngày làm</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ r, a }) => (
              <tr key={r.activityId} className="hover:bg-muted/40">
                <td className={td}>
                  {a.topicEn}
                  {a.level ? <span className="block text-xs text-ink-soft">{a.level.name}</span> : null}
                </td>
                <td className={td}>
                  {a.titleVi}
                  <span className="block text-xs text-ink-soft">{KIND_LABEL_VI[a.kind]}</span>
                </td>
                <td className={cn(td, "font-semibold tabular-nums", scoreTone(r.ratio))}>{pct(r.ratio)}</td>
                <td className={td}>
                  <Badge tone={r.stars === 3 ? "success" : r.stars === 0 ? "warning" : "neutral"}>
                    {"★".repeat(r.stars)}
                    {"☆".repeat(3 - r.stars)}
                  </Badge>
                </td>
                <td className={`${td} tabular-nums`}>{r.attempts}</td>
                <td className={`${td} text-ink-soft`}>{when(r.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
