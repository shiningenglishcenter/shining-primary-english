import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DataTable, PageHeader, Section, td, th } from "@/components/shell/page-parts";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { emojiSrc } from "@/features/practice/emoji";
import {
  KIND_LABEL_VI,
  levelBySlug,
  levelByCode,
  levelsOf,
  PRACTICE_LEVELS,
  PROGRAMS,
  topicNoun,
} from "@/features/practice/model";
import { getActivityForStaff, getTopicForStaff, listTopicsForStaff } from "@/features/content-editor/queries";
import {
  ActivityEditor,
  NewActivityForm,
  NewTopicForm,
  TopicForm,
  WordsEditor,
} from "@/features/content-editor/components/editor-forms";
import { CopyLinkIcon, GuestLinkPanel, ShareLink } from "@/features/content-editor/components/copy-link";
import { cn } from "@/lib/utils";

/**
 * Practice-content editor pages, shared by /admin/content and
 * /teacher/content (both roles edit content — ARCHITECTURE D23).
 */
export type EditorBase = "/admin/content" | "/teacher/content";

const roleOf = (base: EditorBase) => (base === "/admin/content" ? "admin" : "teacher");

function StatusBadge({ status }: { status: string }) {
  return status === "published" ? (
    <Badge tone="success">Đã xuất bản</Badge>
  ) : (
    <Badge tone="warning">Bản nháp</Badge>
  );
}

function Thumb({ code, size = 32 }: { code: string | null; size?: number }) {
  const src = emojiSrc(code);
  return src ? (
    <Image src={src} alt="" width={size} height={size} unoptimized />
  ) : (
    <span style={{ width: size }} />
  );
}

export async function ContentHome({
  base,
  searchParams,
}: {
  base: EditorBase;
  searchParams: Promise<{ level?: string | string[] }>;
}) {
  await requireRole(roleOf(base));
  const sp = await searchParams;
  const level = levelBySlug(typeof sp.level === "string" ? sp.level : undefined);
  const topics = await listTopicsForStaff(level);

  return (
    <>
      <PageHeader
        title="Bài luyện"
        description="Chủ đề, từ vựng và bài luyện học sinh tự làm. Học sinh ở mọi lớp đều mở được mọi trình độ."
      />
      <nav aria-label="Chương trình" className="mb-3 flex gap-2">
        {PROGRAMS.map((p) => (
          <Link
            key={p.code}
            href={`${base}?level=${levelsOf(p.code)[0].slug}`}
            aria-current={p.code === level.program ? "page" : undefined}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-semibold",
              p.code === level.program
                ? "border-sky bg-sky-soft text-ink"
                : "border-line bg-surface hover:bg-muted",
            )}
          >
            {p.name}
          </Link>
        ))}
      </nav>
      <nav aria-label="Trình độ" className="mb-6 flex flex-wrap gap-2">
        {levelsOf(level.program).map((l) => (
          <Link
            key={l.slug}
            href={`${base}?level=${l.slug}`}
            aria-current={l.slug === level.slug ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              l.slug === level.slug
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface hover:bg-muted",
            )}
          >
            {l.name}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-6">
        {topics.length === 0 ? (
          <p className="text-ink-soft">
            Chưa có {topicNoun(level).toLowerCase()} nào cho {level.name}.
          </p>
        ) : (
          <DataTable testId="content-topics">
            <thead>
              <tr>
                <th className={th}>{topicNoun(level)}</th>
                <th className={th}>Từ vựng</th>
                <th className={th}>Bài luyện</th>
                <th className={th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className={td}>
                    <Link
                      href={`${base}/topics/${t.id}`}
                      className="flex items-center gap-3 font-semibold hover:text-sky hover:underline"
                    >
                      <Thumb code={t.emoji} />
                      <span>
                        {t.titleEn}
                        <span className="block text-xs font-normal text-ink-soft">{t.titleVi}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={`${td} tabular-nums`}>{t.wordCount}</td>
                  <td className={`${td} tabular-nums`}>{t.activityCount}</td>
                  <td className={td}>
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <Section title={`Thêm ${topicNoun(level).toLowerCase()} ${level.name}`}>
          <NewTopicForm levelCode={level.code} base={base} />
        </Section>
      </div>
    </>
  );
}

export async function TopicEditorPage({
  base,
  params,
}: {
  base: EditorBase;
  params: Promise<{ id: string }>;
}) {
  await requireRole(roleOf(base));
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const topic = await getTopicForStaff(id);
  if (!topic) notFound();
  const level = levelByCode(topic.levelCode) ?? PRACTICE_LEVELS[0];

  return (
    <>
      <PageHeader
        title={topic.titleEn}
        description={`${topic.titleVi} · ${topic.levelName}`}
        back={{ href: `${base}?level=${level.slug}`, label: `Chủ đề ${level.name}` }}
      />
      <div className="mb-6">
        {topic.status === "published" ? (
          <ShareLink path={`/learn/topics/${topic.id}`} title={topic.titleEn} what="chủ đề" />
        ) : (
          <p className="text-sm text-ink-soft">Xuất bản chủ đề để lấy link gửi học sinh.</p>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Section
            title={`Từ vựng (${topic.words.length})`}
            description="Từ có hình sẽ dùng trong các trò chơi từ vựng."
          >
            <WordsEditor topicId={topic.id} words={topic.words} />
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Thông tin chủ đề">
            <TopicForm topic={topic} />
          </Section>
          <Section title={`Bài luyện (${topic.activities.length})`} testId="topic-activities">
            <ul className="mb-5 divide-y divide-line rounded-md border border-line">
              {topic.activities.map((a) => (
                <li key={a.id} className="flex items-center gap-2 pr-2 hover:bg-muted">
                  <Link
                    href={`${base}/activities/${a.id}`}
                    className="flex flex-1 items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="flex-1">
                      <span className="font-semibold">{a.titleVi}</span>
                      <span className="block text-xs text-ink-soft">{KIND_LABEL_VI[a.kind]}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                  {a.status === "published" && topic.status === "published" ? (
                    <CopyLinkIcon path={`/learn/play/${a.id}`} label={`Sao chép link bài “${a.titleVi}”`} />
                  ) : null}
                </li>
              ))}
            </ul>
            <NewActivityForm topicId={topic.id} base={base} />
          </Section>
        </div>
      </div>
    </>
  );
}

export async function ActivityEditorPage({
  base,
  params,
}: {
  base: EditorBase;
  params: Promise<{ id: string }>;
}) {
  await requireRole(roleOf(base));
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const activity = await getActivityForStaff(id);
  if (!activity) notFound();

  return (
    <>
      <PageHeader
        title={activity.titleVi}
        description={`${KIND_LABEL_VI[activity.kind]} · ${activity.topic.titleEn}`}
        back={{ href: `${base}/topics/${activity.topic.id}`, label: activity.topic.titleEn }}
      />
      <div className="mb-6 flex max-w-3xl flex-col gap-4">
        {activity.status === "published" && activity.topic.status === "published" ? (
          <ShareLink
            path={`/learn/play/${activity.id}`}
            title={`${activity.topic.titleEn}: ${activity.titleEn}`}
          />
        ) : (
          <p className="text-sm text-ink-soft">Xuất bản bài và chủ đề để lấy link gửi học sinh.</p>
        )}
        <GuestLinkPanel
          activityId={activity.id}
          token={activity.publicToken}
          title={`${activity.topic.titleEn}: ${activity.titleEn}`}
          canShare={activity.status === "published" && activity.topic.status === "published"}
        />
      </div>
      <div className="max-w-3xl">
        <Section title="Sửa bài">
          <ActivityEditor
            base={base}
            activity={{ ...activity, topicId: activity.topic.id }}
            topicWords={activity.topic.words.map((w) => ({ word: w.word, emoji: w.emoji }))}
          />
        </Section>
      </div>
    </>
  );
}
