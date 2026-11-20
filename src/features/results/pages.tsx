import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Star,
} from "lucide-react";
import { ResultsFilters } from "@/features/results/filters";
import { z } from "zod";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTable, PageHeader, td, th } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { KIND_LABEL_VI, levelBySlug, PRACTICE_LEVELS } from "@/features/practice/model";
import {
  classStudents,
  getStudent,
  listResultClasses,
  practiceRecords,
  guestAttempts,
  type ActivityInfo,
  type GuestAttempt,
  type TopicInfo,
} from "@/features/results/queries";
import {
  durationVi,
  INACTIVE_DAYS,
  isScored,
  LOW_AVERAGE,
  latestByActivity,
  REVIEW_BELOW,
  SKILLS,
  skillOf,
  skillProfile,
  summariseActivities,
  summariseStudents,
  topicAverage,
  weakestSkill,
  weakItems,
  type ActivityResult,
  type PracticeRecord,
  type StudentSummary,
} from "@/features/results/summary";
import { cn } from "@/lib/utils";

/**
 * Results pages (D29, D32), shared by /teacher/results and /admin/results.
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
const PAGE_SIZE = 20;
type Dir = "asc" | "desc";
const VIEWS = [
  ["students", "Theo học sinh"],
  ["topics", "Theo chủ đề"],
  ["activities", "Theo bài"],
  ["guests", "Link không cần đăng nhập"],
] as const;
type View = (typeof VIEWS)[number][0];

function filtersOf(sp: Search) {
  const days = PERIODS.find((p) => p.value === one(sp.days))?.value ?? "30";
  const levelSlug = one(sp.level);
  const level =
    levelSlug && PRACTICE_LEVELS.some((l) => l.slug === levelSlug) ? levelBySlug(levelSlug) : null;
  const view: View = VIEWS.find(([v]) => v === one(sp.view))?.[0] ?? "students";
  const sort = one(sp.sort) ?? "";
  const dir: Dir = one(sp.dir) === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.floor(Number(one(sp.page)) || 1));
  const since = days === "all" ? null : new Date(Date.now() - Number(days) * 86_400_000).toISOString();
  return { days, level, sort, dir, view, page, since } as const;
}

// ----------------------------------------------------- sorting and paging ---

type Nav = {
  sort: string;
  dir: Dir;
  page: number;
  href: (patch: Record<string, string | null>) => string;
};

/** Column header that sorts by `key`; a second click reverses the order. */
function SortHead({
  nav,
  k,
  label,
  first = "asc",
  className,
}: {
  nav: Nav;
  k: string;
  label: React.ReactNode;
  /** Order on the first click: numbers read best high → low. */
  first?: Dir;
  className?: string;
}) {
  const active = nav.sort === k;
  const next: Dir = active ? (nav.dir === "asc" ? "desc" : "asc") : first;
  const Icon = !active ? ChevronsUpDown : nav.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(th, className)}
      aria-sort={active ? (nav.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={nav.href({ sort: k, dir: next, page: null })}
        className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}
      >
        {label}
        <Icon className={cn("size-3.5 shrink-0", !active && "opacity-40")} aria-hidden="true" />
      </Link>
    </th>
  );
}

/** Sorts rows by the chosen key (nulls last whatever the direction). */
function sortRows<T>(
  rows: T[],
  nav: Nav,
  keys: Record<string, (r: T) => string | number | null>,
  fallback: string,
) {
  const key = keys[nav.sort] ? nav.sort : fallback;
  const get = keys[key]!;
  const sign = keys[nav.sort] && nav.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    const c =
      typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "vi");
    return c * sign;
  });
}

function paginate<T>(rows: T[], nav: Nav) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(nav.page, pages);
  return { items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages, total: rows.length };
}

function Pager({ nav, page, pages, total }: { nav: Nav; page: number; pages: number; total: number }) {
  if (pages <= 1) return null;
  const link = (p: number, label: React.ReactNode, aria: string) => (
    <Link
      href={nav.href({ page: String(p) })}
      aria-label={aria}
      className="flex h-9 min-w-9 items-center justify-center rounded-md border border-line bg-surface px-2 text-sm hover:bg-muted"
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
      data-testid="pager"
    >
      <span className="text-ink-soft">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
      </span>
      <span className="flex items-center gap-1">
        {page > 1 ? link(page - 1, <ChevronLeft className="size-4" />, "Trang trước") : null}
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
          .map((p, i, arr) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && p - arr[i - 1]! > 1 ? <span className="px-1 text-ink-soft">…</span> : null}
              {p === page ? (
                <span
                  aria-current="page"
                  className="flex h-9 min-w-9 items-center justify-center rounded-md bg-ink px-2 font-semibold text-white"
                >
                  {p}
                </span>
              ) : (
                link(p, p, `Trang ${p}`)
              )}
            </span>
          ))}
        {page < pages ? link(page + 1, <ChevronRight className="size-4" />, "Trang sau") : null}
      </span>
    </nav>
  );
}

// --------------------------------------------------------------- display ---

const TZ = "Asia/Ho_Chi_Minh";
const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", timeZone: TZ }); // 05/11

/** "10/11 · 21:28" */
function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
}

/** "hôm nay", "hôm qua", "5 ngày trước" */
function ago(iso: string | null): string {
  if (!iso) return "Chưa làm bài";
  const days = Math.round((Date.parse(dayKey(new Date())) - Date.parse(dayKey(new Date(iso)))) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

function textTone(r: number | null) {
  if (r === null) return "text-ink-soft";
  if (r >= 0.8) return "text-leaf";
  if (r < LOW_AVERAGE) return "text-berry";
  return "text-ink";
}
function cellTone(r: number | null) {
  if (r === null) return "bg-muted/60 text-ink-soft";
  if (r >= 0.8) return "bg-leaf-soft text-leaf";
  if (r < LOW_AVERAGE) return "bg-berry-soft text-berry";
  return "bg-sun-soft text-ink";
}

function Legend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
      {(
        [
          ["bg-leaf", "từ 80%"],
          ["bg-sun", "50–79%"],
          ["bg-berry", "dưới 50%"],
          ["bg-line", "chưa làm"],
        ] as const
      ).map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm", c)} aria-hidden="true" />
          {l}
        </span>
      ))}
    </p>
  );
}

/** One small square per activity of a topic, coloured by its latest score. */
function Strip({
  topic,
  results,
  activities,
}: {
  topic: TopicInfo;
  results: Map<string, ActivityResult>;
  activities: Map<string, ActivityInfo>;
}) {
  return (
    <span className="flex flex-wrap gap-1" aria-hidden="true">
      {topic.activityIds.map((id) => {
        const r = results.get(id);
        const a = activities.get(id)!;
        const color = !r
          ? "bg-line"
          : !isScored(a.kind) || r.ratio >= 0.8
            ? "bg-leaf"
            : r.ratio < LOW_AVERAGE
              ? "bg-berry"
              : "bg-sun";
        return (
          <span
            key={id}
            title={`${a.titleVi}: ${r ? pct(r.ratio) : "chưa làm"}`}
            className={cn("size-3.5 rounded-sm", color)}
          />
        );
      })}
    </span>
  );
}

function Delta({ first, last, attempts }: { first: number; last: number; attempts: number }) {
  if (attempts < 2)
    return <span className={cn("font-semibold tabular-nums", textTone(last))}>{pct(last)}</span>;
  const diff = Math.round((last - first) * 100);
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : ArrowRight;
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className="text-ink-soft">{pct(first)}</span>
      <ArrowRight className="size-3 text-ink-soft" aria-label="thành" />
      <span className={cn("font-semibold", textTone(last))}>{pct(last)}</span>
      {diff !== 0 ? (
        <Icon
          className={cn("size-3.5", diff > 0 ? "text-leaf" : "text-berry")}
          aria-label={diff > 0 ? `tăng ${diff}%` : `giảm ${-diff}%`}
        />
      ) : null}
    </span>
  );
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
  const { records, activities, topics } = await practiceRecords(
    students.map((s) => s.id),
    f.since,
    f.level?.code ?? null,
  );
  const kindOf = (id: string) => activities.get(id)?.kind;

  const query = (patch: Record<string, string | null> = {}) => {
    const p = new URLSearchParams({
      class: cls.id,
      days: f.days,
      ...(f.level ? { level: f.level.slug } : {}),
      view: f.view,
      ...(f.sort ? { sort: f.sort, dir: f.dir } : {}),
      ...(f.page > 1 ? { page: String(f.page) } : {}),
    });
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return p.toString();
  };
  const nav: Nav = { sort: f.sort, dir: f.dir, page: f.page, href: (patch) => `${base}?${query(patch)}` };

  return (
    <>
      <PageHeader
        title="Kết quả học sinh"
        description="Điểm lấy theo lần làm gần nhất của mỗi bài; thẻ từ không tính điểm."
      />

      <ResultsFilters
        base={base}
        keep={{}}
        fields={[
          {
            name: "class",
            label: "Lớp",
            value: cls.id,
            options: classes.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })),
          },
          {
            name: "view",
            label: "Xem theo",
            value: f.view,
            options: VIEWS.map(([v, l]) => ({ value: v, label: l })),
          },
          {
            name: "days",
            label: "Thời gian",
            value: f.days,
            options: PERIODS.map((p) => ({ value: p.value, label: p.label })),
          },
          {
            name: "level",
            label: "Trình độ",
            value: f.level?.slug ?? "",
            options: [
              { value: "", label: "Tất cả trình độ" },
              ...PRACTICE_LEVELS.map((l) => ({ value: l.slug, label: l.name })),
            ],
          },
        ]}
      />

      {f.view === "guests" ? (
        <GuestTable attempts={await guestAttempts(f.since, f.level?.code ?? null)} nav={nav} />
      ) : students.length === 0 ? (
        <p className="text-ink-soft">Lớp này chưa có học sinh.</p>
      ) : f.view === "students" ? (
        <StudentsTable
          base={base}
          students={students}
          summaries={summariseStudents(
            students.map((s) => s.id),
            records,
            kindOf,
          )}
          nav={nav}
          detailQuery={query({ sort: null, dir: null, page: null })}
        />
      ) : f.view === "topics" ? (
        <TopicMatrix
          base={base}
          students={students}
          records={records}
          topics={topics}
          kindOf={kindOf}
          nav={nav}
          detailQuery={(topicId) => query({ topic: topicId, sort: null, dir: null, page: null, view: null })}
        />
      ) : (
        <ActivitiesTable classSize={students.length} records={records} activities={activities} nav={nav} />
      )}
    </>
  );
}

function StudentsTable({
  base,
  students,
  summaries,
  nav,
  detailQuery,
}: {
  base: ResultsBase;
  students: { id: string; code: string; name: string }[];
  summaries: StudentSummary[];
  nav: Nav;
  detailQuery: string;
}) {
  const byId = new Map(summaries.map((s) => [s.studentId, s]));
  type Row = { st: (typeof students)[number]; sum: StudentSummary };
  const rows = sortRows<Row>(
    students.map((st) => ({ st, sum: byId.get(st.id)! })),
    nav,
    {
      name: (r) => r.st.name,
      done: (r) => r.sum.done,
      avg: (r) => r.sum.average,
      time: (r) => r.sum.seconds,
      last: (r) => r.sum.lastAt,
    },
    "name",
  );
  const { items, ...paging } = paginate(rows, nav);
  const flagged = rows.filter((r) => r.sum.needsSupport).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {rows.length} học sinh ·{" "}
        <span className={flagged ? "font-semibold text-berry" : undefined}>⚠ {flagged} cần chú ý</span> (không
        làm bài {INACTIVE_DAYS} ngày, hoặc điểm TB dưới {LOW_AVERAGE * 100}%)
      </p>
      <DataTable testId="results-students">
        <thead>
          <tr>
            <SortHead nav={nav} k="name" label="Học sinh" />
            <SortHead nav={nav} k="done" label="Số bài đã làm" first="desc" />
            <SortHead nav={nav} k="avg" label="Điểm TB" first="desc" />
            <SortHead nav={nav} k="time" label="Thời gian học" first="desc" />
            <SortHead nav={nav} k="last" label="Lần gần nhất" first="desc" />
          </tr>
        </thead>
        <tbody>
          {items.map(({ st, sum }) => (
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
                  <span className="text-xs text-ink-soft"> · {sum.attempts} lượt</span>
                ) : null}
                <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-ink-soft">
                  <Star className="size-3 fill-sun text-sun" aria-hidden="true" />
                  {sum.stars}
                </span>
              </td>
              <td className={cn(td, "font-semibold tabular-nums", textTone(sum.average))}>
                {pct(sum.average)}
              </td>
              <td className={`${td} tabular-nums`}>
                {sum.seconds ? durationVi(sum.seconds) : "—"}
                {sum.days ? (
                  <span className="block text-xs text-ink-soft">{sum.days} ngày có học</span>
                ) : null}
              </td>
              <td className={cn(td, sum.needsSupport && !sum.lastAt ? "text-berry" : "text-ink-soft")}>
                {ago(sum.lastAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager nav={nav} {...paging} />
    </div>
  );
}

/** Students × topics, each cell the student's average in that topic (D32). */
function TopicMatrix({
  base,
  students,
  records,
  topics,
  kindOf,
  nav,
  detailQuery,
}: {
  base: ResultsBase;
  students: { id: string; code: string; name: string }[];
  records: PracticeRecord[];
  topics: TopicInfo[];
  kindOf: (id: string) => ActivityInfo["kind"] | undefined;
  nav: Nav;
  detailQuery: (topicId: string) => string;
}) {
  if (topics.length === 0)
    return <p className="text-ink-soft">Chưa có học sinh nào làm bài trong khoảng này.</p>;
  const latest = latestByActivity(records);
  const cell = (studentId: string, t: TopicInfo) => {
    const mine = latest.get(studentId);
    const results = t.activityIds.flatMap((id) => (mine?.get(id) ? [mine.get(id)!] : []));
    return { done: results.length, avg: topicAverage(results, kindOf) };
  };
  const studentAvg = (studentId: string) => {
    const mine = [...(latest.get(studentId)?.values() ?? [])];
    return topicAverage(mine, kindOf);
  };
  const keys: Record<string, (s: (typeof students)[number]) => string | number | null> = {
    name: (s) => s.name,
    avg: (s) => studentAvg(s.id),
  };
  for (const t of topics) keys[`t-${t.id}`] = (s) => (cell(s.id, t).done ? cell(s.id, t).avg : null);
  const { items, ...paging } = paginate(sortRows(students, nav, keys, "name"), nav);
  const classAvg = (t: TopicInfo) => {
    const avgs = students.map((s) => cell(s.id, t).avg).filter((x): x is number => x !== null);
    return avgs.length ? avgs.reduce((n, x) => n + x, 0) / avgs.length : null;
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Mỗi ô: điểm trung bình của học sinh ở chủ đề đó và số bài đã làm. Hàng cuối là trung bình cả lớp — chủ
        đề đỏ/vàng là chủ đề nên dạy lại. Bấm vào ô để xem chi tiết.
      </p>
      <Legend />
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm" data-testid="results-matrix">
          <thead>
            <tr>
              <SortHead
                nav={nav}
                k="name"
                label="Học sinh"
                className="sticky left-0 z-10 min-w-48 bg-surface"
              />
              {topics.map((t) => (
                <SortHead
                  key={t.id}
                  nav={nav}
                  k={`t-${t.id}`}
                  first="desc"
                  className="w-28 max-w-32 min-w-24 align-bottom"
                  label={
                    <span>
                      <span className="line-clamp-2 normal-case" title={t.titleEn}>
                        {t.titleEn}
                      </span>
                      {t.level ? (
                        <span className="block text-[10px] font-normal normal-case">{t.level.short}</span>
                      ) : null}
                    </span>
                  }
                />
              ))}
              <SortHead nav={nav} k="avg" label="TB" first="desc" className="min-w-16 align-bottom" />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className={cn(td, "sticky left-0 z-10 bg-surface font-semibold")}>{s.name}</td>
                {topics.map((t) => {
                  const c = cell(s.id, t);
                  return (
                    <td key={t.id} className="p-1">
                      <Link
                        href={`${base}/students/${s.id}?${detailQuery(t.id)}#topic-${t.id}`}
                        className={cn(
                          "flex flex-col items-center rounded-md px-2 py-1.5 tabular-nums hover:ring-2 hover:ring-sky",
                          cellTone(c.done ? c.avg : null),
                        )}
                        aria-label={`${s.name}, ${t.titleEn}: ${c.done ? pct(c.avg) : "chưa làm"}`}
                      >
                        <span className="font-semibold">{c.done ? pct(c.avg) : "·"}</span>
                        <span className="text-[10px] opacity-80">
                          {c.done}/{t.activityIds.length}
                        </span>
                      </Link>
                    </td>
                  );
                })}
                <td className={cn(td, "font-semibold tabular-nums", textTone(studentAvg(s.id)))}>
                  {pct(studentAvg(s.id))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-line bg-paper">
              <td className={cn(td, "sticky left-0 z-10 bg-paper font-semibold")}>Trung bình lớp</td>
              {topics.map((t) => {
                const avg = classAvg(t);
                return (
                  <td key={t.id} className="p-1">
                    <span
                      className={cn(
                        "flex justify-center rounded-md px-2 py-1.5 font-semibold tabular-nums",
                        cellTone(avg),
                      )}
                    >
                      {pct(avg)}
                    </span>
                  </td>
                );
              })}
              <td className="p-1" />
            </tr>
          </tbody>
        </table>
      </div>
      <Pager nav={nav} {...paging} />
    </div>
  );
}

function ActivitiesTable({
  classSize,
  records,
  activities,
  nav,
}: {
  classSize: number;
  records: PracticeRecord[];
  activities: Map<string, ActivityInfo>;
  nav: Nav;
}) {
  type Row = { s: ReturnType<typeof summariseActivities>[number]; a: ActivityInfo };
  const all = summariseActivities(records)
    .map((s) => ({ s, a: activities.get(s.activityId)! }))
    .filter((r) => r.a && isScored(r.a.kind));
  if (all.length === 0)
    return <p className="text-ink-soft">Chưa có học sinh nào làm bài trong khoảng này.</p>;
  // Default: hardest first (lowest average).
  const rows = sortRows<Row>(
    all,
    nav,
    {
      name: (r) => r.a.titleVi,
      topic: (r) => r.a.sortKey,
      done: (r) => r.s.students,
      avg: (r) => r.s.average,
      default: (r) => r.s.average,
    },
    "default",
  );
  const { items, ...paging } = paginate(rows, nav);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">Mặc định: bài khó nhất (điểm TB thấp nhất) ở trên cùng.</p>
      <DataTable testId="results-activities">
        <thead>
          <tr>
            <SortHead nav={nav} k="name" label="Bài" />
            <SortHead nav={nav} k="topic" label="Chủ đề / Unit" />
            <SortHead nav={nav} k="done" label="Đã làm" first="desc" />
            <SortHead nav={nav} k="avg" label="Điểm TB" />
          </tr>
        </thead>
        <tbody>
          {items.map(({ s, a }) => (
            <tr key={s.activityId} className="hover:bg-muted/40">
              <td className={td}>
                <ActivityName a={a} />
              </td>
              <td className={td}>
                {a.topicEn}
                {a.level ? <span className="block text-xs text-ink-soft">{a.level.name}</span> : null}
              </td>
              <td className={`${td} tabular-nums`}>
                {s.students}/{classSize}
              </td>
              <td className={cn(td, "font-semibold tabular-nums", textTone(s.average))}>{pct(s.average)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager nav={nav} {...paging} />
    </div>
  );
}

/** Rounds played through guest links (D35), newest first by default. */
function GuestTable({ attempts, nav }: { attempts: GuestAttempt[]; nav: Nav }) {
  if (attempts.length === 0) {
    return (
      <p className="text-ink-soft">
        Chưa có ai làm bài qua link không cần đăng nhập trong khoảng này. Bật link ở trang sửa bài (Bài luyện
        → bài → “Cho làm không cần đăng nhập”).
      </p>
    );
  }
  const rows = sortRows<GuestAttempt>(
    attempts,
    nav,
    {
      name: (r) => r.name,
      activity: (r) => r.activityTitle,
      topic: (r) => r.topicEn,
      score: (r) => r.ratio,
      time: (r) => r.seconds,
      when: (r) => r.recordedAt,
      default: (r) => -Date.parse(r.recordedAt),
    },
    "default",
  );
  const { items, ...paging } = paginate(rows, nav);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Tên do trẻ tự nhập nên có thể trùng hoặc viết khác nhau. Mục này không theo lớp và không tính vào kết
        quả của học sinh có tài khoản.
      </p>
      <DataTable testId="results-guests">
        <thead>
          <tr>
            <SortHead nav={nav} k="name" label="Tên" />
            <SortHead nav={nav} k="activity" label="Bài" />
            <SortHead nav={nav} k="topic" label="Chủ đề / Unit" />
            <SortHead nav={nav} k="score" label="Điểm" first="desc" />
            <SortHead nav={nav} k="time" label="Thời gian" first="desc" />
            <SortHead nav={nav} k="when" label="Lúc làm" first="desc" />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className={cn(td, "font-semibold")}>{r.name}</td>
              <td className={td}>
                {r.activityTitle}
                <span className="block text-xs text-ink-soft">{KIND_LABEL_VI[r.kind]}</span>
              </td>
              <td className={td}>
                {r.topicEn}
                {r.level ? <span className="block text-xs text-ink-soft">{r.level.name}</span> : null}
              </td>
              <td className={cn(td, "font-semibold tabular-nums", textTone(r.ratio))}>{pct(r.ratio)}</td>
              <td className={`${td} tabular-nums`}>{r.seconds ? durationVi(r.seconds) : "—"}</td>
              <td className={`${td} whitespace-nowrap text-ink-soft`}>{when(r.recordedAt)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager nav={nav} {...paging} />
    </div>
  );
}

/** Activity title, plus its kind when the title does not already say it. */
function ActivityName({ a }: { a: ActivityInfo }) {
  const kind = KIND_LABEL_VI[a.kind];
  return (
    <>
      {a.titleVi}
      {a.titleVi.toLowerCase().startsWith(kind.toLowerCase()) ? null : (
        <span className="block text-xs text-ink-soft">{kind}</span>
      )}
    </>
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
  const { records, activities, topics } = await practiceRecords([id], f.since, f.level?.code ?? null);
  const kindOf = (aid: string) => activities.get(aid)?.kind;
  const [summary] = summariseStudents([id], records, kindOf);
  const mine = latestByActivity(records).get(id) ?? new Map<string, ActivityResult>();
  const results = [...mine.values()];
  const total = topics.reduce((n, t) => n + t.activityIds.length, 0);
  const profile = skillProfile(results, kindOf);
  const weakest = weakestSkill(profile);
  const review = results
    .filter((r) => {
      const k = kindOf(r.activityId);
      return k && isScored(k) && r.ratio < REVIEW_BELOW;
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 8);
  const weak = weakItems(records);
  const openTopic = one(sp.topic);
  const back = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "topic" ? [[k, v]] : [])),
  ).toString();
  const period = PERIODS.find((p) => p.value === f.days)!.label.toLowerCase();

  return (
    <>
      <PageHeader
        title={student.name}
        description={`${student.code} · ${period}${f.level ? ` · ${f.level.name}` : ""}`}
        back={{ href: `${base}${back ? `?${back}` : ""}`, label: "Kết quả của lớp" }}
      />

      <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="student-figures">
        <Figure label="Đã làm">
          <span className="tabular-nums">
            {summary!.done}
            <span className="text-base text-ink-soft">/{total} bài</span>
          </span>
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-leaf"
              style={{ width: `${total ? Math.round((summary!.done / total) * 100) : 0}%` }}
            />
          </span>
          <span className="mt-1 block text-xs font-normal text-ink-soft">trong các chủ đề em đã mở</span>
        </Figure>
        <Figure label="Điểm trung bình">
          <span className={textTone(summary!.average)}>{pct(summary!.average)}</span>
          <span className="mt-1 block text-xs font-normal text-ink-soft">
            {summary!.attempts} lượt làm · {summary!.stars} sao
          </span>
        </Figure>
        <Figure label="Thời gian học">
          {summary!.seconds ? durationVi(summary!.seconds) : "—"}
          <span className="mt-1 block text-xs font-normal text-ink-soft">{summary!.days} ngày có học</span>
        </Figure>
        <Figure label="Lần học gần nhất">
          <span className={summary!.needsSupport && !summary!.lastAt ? "text-berry" : undefined}>
            {ago(summary!.lastAt)}
          </span>
          {summary!.needsSupport ? (
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-berry">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Cần chú ý
            </span>
          ) : null}
        </Figure>
      </ul>

      {results.length === 0 ? (
        <p className="text-ink-soft">Học sinh chưa làm bài nào trong khoảng này.</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-line bg-surface p-5" data-testid="skills">
              <h2 className="mb-4 font-semibold">Kỹ năng</h2>
              <ul className="flex flex-col gap-3">
                {profile.map((p) => {
                  const name = SKILLS.find((s) => s.code === p.skill)!.vi;
                  return (
                    <li key={p.skill} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            p.average === null
                              ? ""
                              : p.average >= 0.8
                                ? "bg-leaf"
                                : p.average < LOW_AVERAGE
                                  ? "bg-berry"
                                  : "bg-sun",
                          )}
                          style={{ width: `${Math.round((p.average ?? 0) * 100)}%` }}
                        />
                      </span>
                      <span className={cn("text-right font-semibold tabular-nums", textTone(p.average))}>
                        {pct(p.average)}
                      </span>
                      <span className="col-span-3 -mt-2 text-xs text-ink-soft">
                        {p.activities ? `${p.activities} bài` : "Chưa làm bài nào"}
                        {weakest === p.skill ? (
                          <span className="ml-2 font-semibold text-berry">⚠ yếu nhất</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-ink-soft">
                Từ vựng: nhìn chọn từ, nối. Nghe: nghe chọn hình, bài nghe/video. Đọc: đọc hiểu, đúng/sai.
                Viết: xếp chữ, nghe và viết, sắp xếp câu, điền từ. Bài tổng hợp và thẻ từ không tính vào kỹ
                năng.
              </p>
            </section>

            <section
              className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5"
              data-testid="review"
            >
              <div>
                <h2 className="mb-2 font-semibold">Cần ôn lại</h2>
                {review.length === 0 ? (
                  <p className="text-sm text-ink-soft">Không có bài nào dưới {REVIEW_BELOW * 100}%. 👍</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {review.map((r) => {
                      const a = activities.get(r.activityId)!;
                      return (
                        <li key={r.activityId} className="flex items-baseline justify-between gap-3">
                          <span>
                            {a.titleVi} <span className="text-ink-soft">· {a.topicEn}</span>
                          </span>
                          <span className={cn("font-semibold tabular-nums", textTone(r.ratio))}>
                            {pct(r.ratio)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <h2 className="mb-2 font-semibold">Từ / câu hay sai</h2>
                {weak.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    Chưa có dữ liệu. Mục này ghi lại từ các lượt làm bài mới (từ 12/11/2026).
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2 text-sm" data-testid="weak-items">
                    {weak.map((w) => (
                      <li
                        key={`${w.type}|${w.label}`}
                        className={cn(
                          "rounded-md px-2.5 py-1",
                          w.missed / w.seen >= 0.5 ? "bg-berry-soft" : "bg-sun-soft",
                        )}
                      >
                        <span className="font-medium">{w.label}</span>{" "}
                        <span className="text-xs text-ink-soft">
                          sai {w.missed}/{w.seen} lần
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section data-testid="topics">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Theo chủ đề</h2>
              <Legend />
            </div>
            <div className="flex flex-col gap-2">
              {topics.map((t) => (
                <TopicBlock
                  key={t.id}
                  topic={t}
                  results={mine}
                  activities={activities}
                  open={openTopic === t.id}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <div className="text-2xl font-semibold">{children}</div>
    </li>
  );
}

function TopicBlock({
  topic,
  results,
  activities,
  open,
}: {
  topic: TopicInfo;
  results: Map<string, ActivityResult>;
  activities: Map<string, ActivityInfo>;
  open: boolean;
}) {
  const done = topic.activityIds.filter((id) => results.has(id));
  const avg = topicAverage(
    done.map((id) => results.get(id)!),
    (id) => activities.get(id)?.kind,
  );
  return (
    <details
      id={`topic-${topic.id}`}
      open={open}
      className="group rounded-lg border border-line bg-surface open:shadow-sm"
      data-testid="topic-block"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-muted/40">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        <span className="min-w-40 flex-1 font-semibold">
          {topic.titleEn}
          {topic.level ? (
            <span className="ml-2 text-xs font-normal text-ink-soft">{topic.level.name}</span>
          ) : null}
        </span>
        <Strip topic={topic} results={results} activities={activities} />
        <span className="w-14 text-sm text-ink-soft tabular-nums">
          {done.length}/{topic.activityIds.length}
        </span>
        <span className={cn("w-12 text-right font-semibold tabular-nums", textTone(avg))}>{pct(avg)}</span>
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr>
              <th className={th}>Bài</th>
              <th className={th}>Kỹ năng</th>
              <th className={th}>Lần đầu → gần nhất</th>
              <th className={th}>Lượt</th>
              <th className={th}>Thời gian</th>
              <th className={th}>Ngày làm</th>
            </tr>
          </thead>
          <tbody>
            {topic.activityIds.map((id) => {
              const a = activities.get(id)!;
              const r = results.get(id);
              const skill = skillOf(a.kind);
              return (
                <tr key={id} className={cn("border-t border-line", !r && "text-ink-soft")}>
                  <td className={td}>
                    <ActivityName a={a} />
                  </td>
                  <td className={td}>{skill ? SKILLS.find((s) => s.code === skill)!.vi : "—"}</td>
                  <td className={td}>
                    {!r ? (
                      "Chưa làm"
                    ) : !isScored(a.kind) ? (
                      "Đã xem"
                    ) : (
                      <Delta first={r.firstRatio} last={r.ratio} attempts={r.attempts} />
                    )}
                  </td>
                  <td className={`${td} tabular-nums`}>{r?.attempts ?? "—"}</td>
                  <td className={`${td} tabular-nums`}>{r?.seconds ? durationVi(r.seconds) : "—"}</td>
                  <td className={`${td} whitespace-nowrap`}>{r ? when(r.lastAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
