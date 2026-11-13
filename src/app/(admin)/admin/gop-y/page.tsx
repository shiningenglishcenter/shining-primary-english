import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, ExternalLink, MessageSquareHeart, Star } from "lucide-react";
import { EmptyState, PageSkeleton } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { NoteBox, StatusPicker } from "@/features/feedback/components/admin-controls";
import {
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  RATINGS,
  SEVERITIES,
  STATUSES,
  labelOf,
} from "@/features/feedback/labels";
import { listFeedback } from "@/features/feedback/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Góp ý" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const when = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));

/** Admin triage of pilot feedback (D38). */
async function FeedbackAdmin({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("admin");
  const [sp, all] = await Promise.all([searchParams, listFeedback()]);
  const status = one(sp.status) ?? "";
  const kind = one(sp.kind) ?? "";
  const rows = all
    .filter((f) => !status || f.status === status)
    .map((f) => ({ ...f, items: f.items.filter((i) => !kind || i.kind === kind) }))
    .filter((f) => !kind || f.items.length > 0);
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s.code, all.filter((f) => f.status === s.code).length]),
  );
  const itemCount = (k: string) => all.reduce((n, f) => n + f.items.filter((i) => i.kind === k).length, 0);
  const avg = (code: string) => {
    const xs = all.map((f) => f.ratings[code]).filter((x): x is number => typeof x === "number");
    return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "—";
  };
  const chip = (key: "status" | "kind", value: string, label: string) => {
    const p = new URLSearchParams({ ...(status ? { status } : {}), ...(kind ? { kind } : {}) });
    if (value) p.set(key, value);
    else p.delete(key);
    const active = (key === "status" ? status : kind) === value;
    return (
      <Link
        key={`${key}-${value}`}
        href={`/admin/gop-y${p.size ? `?${p}` : ""}`}
        className={cn(
          "rounded-full border px-3 py-1.5 text-sm font-semibold",
          active ? "border-ink bg-ink text-white" : "border-line bg-surface hover:bg-muted",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="Góp ý từ giáo viên"
        description={
          <>
            Gửi từ trang công khai{" "}
            <Link href="/gop-y" className="font-semibold text-sky hover:underline">
              /gop-y
            </Link>
            . Không có thông báo — xem ở đây.
          </>
        }
        action={
          <a
            href="/admin/gop-y/export"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-semibold hover:bg-muted"
          >
            <Download className="size-4" aria-hidden="true" />
            Xuất CSV
          </a>
        }
      />

      <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="feedback-figures">
        {RATINGS.map((r) => (
          <li key={r.code} className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm text-ink-soft">{r.label}</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-semibold">
              <Star className="size-5 fill-sun text-sun" aria-hidden="true" />
              {avg(r.code)}
              <span className="text-sm font-normal text-ink-soft">/ 5</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="mb-5 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {chip("status", "", `Tất cả (${all.length})`)}
          {STATUSES.map((s) => chip("status", s.code, `${s.label} (${counts[s.code] ?? 0})`))}
        </div>
        <div className="flex flex-wrap gap-2">
          {chip("kind", "", "Mọi loại")}
          {FEEDBACK_KINDS.map((k) => chip("kind", k.code, `${k.icon} ${k.label} (${itemCount(k.code)})`))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={MessageSquareHeart} title="Chưa có góp ý nào">
          Gửi link{" "}
          <Link href="/gop-y" className="font-semibold text-sky hover:underline">
            /gop-y
          </Link>{" "}
          cho giáo viên sau khi họ dùng thử.
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-4" data-testid="feedback-list">
          {rows.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-line bg-surface p-5"
              data-testid="feedback-entry"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {f.name ?? "Ẩn danh"}
                    {f.contact ? (
                      <a
                        href={`https://zalo.me/${f.contact.replace(/^\+84/, "0")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 text-base font-semibold text-sky hover:underline"
                      >
                        Zalo {f.contact}
                      </a>
                    ) : null}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {when(f.createdAt)}
                    {f.pageUrl ? (
                      <>
                        {" · từ trang "}
                        <Link
                          href={f.pageUrl}
                          className="inline-flex items-center gap-0.5 text-sky hover:underline"
                        >
                          {f.pageUrl}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <StatusPicker id={f.id} status={f.status} />
              </div>

              {Object.keys(f.ratings).length ? (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {RATINGS.filter((r) => f.ratings[r.code]).map((r) => (
                    <span key={r.code}>
                      {r.label.replace(/\?$/, "")}: <b>{f.ratings[r.code]}★</b>
                    </span>
                  ))}
                </p>
              ) : null}

              {f.items.length ? (
                <ul className="mt-4 flex flex-col gap-3">
                  {f.items.map((i) => (
                    <li
                      key={i.id}
                      className={cn(
                        "rounded-lg border p-3",
                        i.kind === "idea" ? "border-2 border-sun bg-sun-soft/50" : "border-line bg-paper",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="rounded-full bg-surface px-2 py-0.5 font-semibold">
                            {FEEDBACK_KINDS.find((k) => k.code === i.kind)?.icon}{" "}
                            {labelOf(FEEDBACK_KINDS, i.kind)}
                          </span>
                          <span className="text-ink-soft">{labelOf(FEEDBACK_AREAS, i.area)}</span>
                          {i.severity ? (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                i.severity === "blocker" ? "bg-berry-soft text-berry" : "bg-sun-soft",
                              )}
                            >
                              {labelOf(SEVERITIES, i.severity)}
                            </span>
                          ) : null}
                        </p>
                        <StatusPicker id={i.id} status={i.status} item />
                      </div>
                      <p className="mt-2 whitespace-pre-line">{i.description}</p>
                      {i.steps ? (
                        <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">
                          <b className="text-ink">Các bước:</b> {i.steps}
                        </p>
                      ) : null}
                      {i.screenshots.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {i.screenshots.map((s) =>
                            s.url ? (
                              <a key={s.path} href={s.url} target="_blank" rel="noreferrer">
                                <Image
                                  src={s.url}
                                  alt="Ảnh chụp màn hình"
                                  width={120}
                                  height={120}
                                  unoptimized
                                  className="size-30 rounded-md border border-line object-cover"
                                />
                              </a>
                            ) : null,
                          )}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {f.liked || f.change ? (
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  {f.liked ? (
                    <div>
                      <dt className="font-semibold">Thích nhất</dt>
                      <dd className="whitespace-pre-line text-ink-soft">{f.liked}</dd>
                    </div>
                  ) : null}
                  {f.change ? (
                    <div>
                      <dt className="font-semibold">Nhận xét khác</dt>
                      <dd className="whitespace-pre-line text-ink-soft">{f.change}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <div className="mt-4">
                <NoteBox id={f.id} note={f.adminNote} />
              </div>
              {f.userAgent ? (
                <p className="mt-2 truncate text-xs text-ink-soft">Thiết bị: {f.userAgent}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/admin/gop-y">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FeedbackAdmin searchParams={searchParams} />
    </Suspense>
  );
}
