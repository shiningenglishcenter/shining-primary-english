import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shell/page-parts";
import { requireRole } from "@/lib/auth/session";
import { emojiSrc } from "@/features/practice/emoji";
import {
  KIND_LABEL_VI,
  levelBySlug,
  levelByCode,
  levelsOf,
  programOf,
  topicNoun,
} from "@/features/practice/model";
import { getLevelCatalog } from "@/features/practice/catalog";
import {
  getActivityForStaff,
  getTopicForStaff,
  listTopicsForStaff,
  topicCountsByLevel,
} from "@/features/content-editor/queries";
import { TopicList } from "@/features/content-editor/components/topic-list";
import {
  ActivityEditor,
  NewActivityForm,
  NextStepCard,
  TopicForm,
  WordsEditor,
} from "@/features/content-editor/components/editor-forms";
import { CopyLinkIcon, GuestLinkPanel, ShareLink } from "@/features/content-editor/components/copy-link";
import {
  ActivityList,
  BulkWordsForm,
  PatternsEditor,
  TopicStatusSwitch,
} from "@/features/content-editor/components/topic-tabs";
import { cn } from "@/lib/utils";

/**
 * Practice-content editor pages, shared by /admin/content and
 * /teacher/content (both roles edit content — ARCHITECTURE D23).
 */
export type EditorBase = "/admin/content" | "/teacher/content";

const roleOf = (base: EditorBase) => (base === "/admin/content" ? "admin" : "teacher");

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
  const [sp, cat] = await Promise.all([searchParams, getLevelCatalog()]);
  const level = levelBySlug(typeof sp.level === "string" ? sp.level : undefined, cat);
  const [topics, counts] = await Promise.all([listTopicsForStaff(level), topicCountsByLevel()]);
  const noun = topicNoun(level);
  const programCount = (code: string) =>
    levelsOf(code, cat).reduce((n, l) => n + (counts.get(l.code) ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Bài luyện"
        description="Chọn chương trình → trình độ → mở chủ đề để sửa từ vựng, mẫu câu và bài luyện."
        action={
          base === "/admin/content" ? (
            <Link
              href="/admin/programs"
              className="text-sm font-semibold text-sky underline-offset-4 hover:underline"
            >
              ⚙ Quản lý chương trình &amp; trình độ
            </Link>
          ) : undefined
        }
      />
      <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
        <nav
          aria-label="Chương trình"
          className="flex flex-wrap gap-x-8 border-b border-line px-5"
          data-testid="program-tabs"
        >
          {cat.programs.map((p) => {
            const on = p.code === level.program;
            return (
              <Link
                key={p.code}
                href={`${base}?level=${levelsOf(p.code, cat)[0]?.slug ?? level.slug}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-[3px] py-3.5 text-base font-semibold",
                  on ? "border-sky text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {p.name}
                <span className="rounded-full bg-sky-soft px-2 text-xs font-bold text-ink">
                  {programCount(p.code)}
                </span>
              </Link>
            );
          })}
        </nav>
        <nav
          aria-label={`Trình độ của ${programOf(level, cat).name}`}
          className="flex flex-wrap gap-x-6 bg-paper pr-5 pl-9"
          data-testid="level-tabs"
        >
          {levelsOf(level.program, cat).map((l) => {
            const on = l.slug === level.slug;
            return (
              <Link
                key={l.slug}
                href={`${base}?level=${l.slug}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 py-2.5 text-sm font-semibold",
                  on ? "border-sky text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {l.short}
                <span className="rounded-full bg-sky-soft px-2 text-xs font-bold text-ink">
                  {counts.get(l.code) ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
      <TopicList base={base} levelCode={level.code} levelName={level.name} noun={noun} rows={topics} />
    </>
  );
}

const TOPIC_TABS = ["info", "words", "patterns", "activities", "share"] as const;
type TopicTab = (typeof TOPIC_TABS)[number];

export async function TopicEditorPage({
  base,
  params,
  searchParams,
}: {
  base: EditorBase;
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireRole(roleOf(base));
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [topic, cat] = await Promise.all([getTopicForStaff(id), getLevelCatalog()]);
  if (!topic) notFound();
  const level = levelByCode(topic.levelCode, cat) ?? cat.levels[0]!;
  const noun = topicNoun(level);
  const raw = typeof sp.tab === "string" ? sp.tab : "";
  const tab: TopicTab = (TOPIC_TABS as readonly string[]).includes(raw) ? (raw as TopicTab) : "words";
  const href = (t: TopicTab) => `${base}/topics/${topic.id}?tab=${t}`;
  const published = topic.status === "published";
  const withPicture = topic.words.filter((w) => w.emoji || w.imagePath).length;

  const steps: { key: TopicTab; label: string; count?: number; done: boolean }[] = [
    { key: "info", label: "Thông tin", done: Boolean(topic.titleEn && topic.titleVi) },
    { key: "words", label: "Từ vựng", count: topic.words.length, done: topic.words.length > 0 },
    { key: "patterns", label: "Mẫu câu", count: topic.patterns.length, done: topic.patterns.length > 0 },
    {
      key: "activities",
      label: "Bài luyện",
      count: topic.activities.length,
      done: topic.activities.length > 0,
    },
    { key: "share", label: "Chia sẻ", done: published },
  ];
  const at = TOPIC_TABS.indexOf(tab);
  const prev = at > 0 ? steps[at - 1] : null;
  const next = at < steps.length - 1 ? steps[at + 1] : null;

  return (
    <>
      <nav aria-label="Đường dẫn" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-ink-soft">
        <Link href={`${base}?level=${level.slug}`} className="hover:text-sky hover:underline">
          Bài luyện · {programOf(level, cat).name} · {level.short}
        </Link>
        <span aria-hidden="true">›</span>
        <span>{topic.titleEn}</span>
      </nav>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-xl bg-sun-soft">
          <Thumb code={topic.emoji} size={40} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold" data-testid="page-title">
            {topic.titleEn}
          </h1>
          <p className="text-sm text-ink-soft">
            {topic.titleVi} · {noun} của {level.name}
          </p>
        </div>
        <TopicStatusSwitch topicId={topic.id} status={topic.status} />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <nav
          aria-label={`Các bước của ${noun.toLowerCase()}`}
          className="overflow-x-auto border-b border-line"
          data-testid="topic-tabs"
        >
          <ol className="flex min-w-max gap-1 px-3 sm:px-4">
            {steps.map((st, i) => (
              <li key={st.key}>
                <Link
                  href={href(st.key)}
                  aria-current={st.key === tab ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 border-b-3 px-3 py-3.5 text-sm font-semibold",
                    st.key === tab
                      ? "border-sky text-ink"
                      : "border-transparent text-ink-soft hover:text-ink",
                  )}
                  data-testid={`tab-${st.key}`}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      st.done ? "bg-leaf text-white" : "bg-muted text-ink-soft",
                    )}
                    aria-hidden="true"
                  >
                    {st.done ? "✓" : i + 1}
                  </span>
                  {st.label}
                  {st.count !== undefined ? (
                    <span className="rounded-full bg-sky-soft px-2 text-xs tabular-nums">{st.count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="p-4 sm:p-6">
          {tab === "info" ? (
            <div className="max-w-3xl">
              <TopicForm topic={topic} />
            </div>
          ) : tab === "words" ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-ink-soft">
                Từ có hình dùng trong các trò chơi từ vựng ({withPicture}/{topic.words.length} từ có hình).
              </p>
              <BulkWordsForm topicId={topic.id} />
              <WordsEditor topicId={topic.id} words={topic.words} />
            </div>
          ) : tab === "patterns" ? (
            <div className="max-w-4xl">
              <PatternsEditor topicId={topic.id} patterns={topic.patterns} />
            </div>
          ) : tab === "activities" ? (
            <div className="flex flex-col gap-6" id="topic-activities" data-testid="topic-activities">
              <NextStepCard
                topicId={topic.id}
                wordsWithPicture={withPicture}
                existingKinds={topic.activities.map((a) => a.kind)}
              />
              <ActivityList
                key={topic.activities
                  .map((a) => a.id + a.status + a.titleVi)
                  .sort()
                  .join()}
                base={base}
                topicId={topic.id}
                topicPublished={published}
                activities={topic.activities}
              />
              <div className="rounded-lg border border-dashed border-line p-4">
                <NewActivityForm topicId={topic.id} base={base} />
              </div>
            </div>
          ) : (
            <div className="flex max-w-3xl flex-col gap-5">
              {published ? (
                <ShareLink path={`/learn/topics/${topic.id}`} title={topic.titleEn} what="chủ đề" />
              ) : (
                <p className="text-sm text-ink-soft">
                  Xuất bản {noun.toLowerCase()} (nút ở trên) để lấy link gửi học sinh.
                </p>
              )}
              {published ? (
                <ul
                  className="divide-y divide-line rounded-md border border-line"
                  data-testid="share-activities"
                >
                  {topic.activities
                    .filter((a) => a.status === "published")
                    .map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="flex-1">
                          <span className="font-semibold">{a.titleVi}</span>
                          <span className="block text-xs text-ink-soft">{KIND_LABEL_VI[a.kind]}</span>
                        </span>
                        <CopyLinkIcon
                          path={`/learn/play/${a.id}`}
                          label={`Sao chép link bài “${a.titleVi}”`}
                        />
                      </li>
                    ))}
                </ul>
              ) : null}
              <p className="text-sm text-ink-soft">
                Link cho khách (không cần đăng nhập) tạo ở từng bài, tab “Chia sẻ”.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-6">
          {prev ? (
            <Link href={href(prev.key)} className="text-sm font-semibold text-sky hover:underline">
              ← {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={href(next.key)}
              className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
              data-testid="next-tab"
            >
              Tiếp: {next.label} →
            </Link>
          ) : null}
        </div>
      </section>
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

  const playable = activity.status === "published" && activity.topic.status === "published";
  const share = (
    <>
      {playable ? (
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
        canShare={playable}
      />
    </>
  );

  return (
    <>
      <PageHeader
        title={activity.titleVi}
        description={`${KIND_LABEL_VI[activity.kind]} · ${activity.topic.titleEn}`}
        back={{ href: `${base}/topics/${activity.topic.id}?tab=activities`, label: activity.topic.titleEn }}
      />
      <ActivityEditor
        base={base}
        activity={{ ...activity, topicId: activity.topic.id }}
        topicWords={activity.topic.words.map((w) => ({ word: w.word, emoji: w.emoji }))}
        previewWords={activity.topic.words.map((w) => ({
          word: w.word,
          meaningVi: w.meaningVi,
          emoji: w.emoji,
          image: w.imageUrl,
          ipa: w.ipa,
        }))}
        share={share}
      />
    </>
  );
}
