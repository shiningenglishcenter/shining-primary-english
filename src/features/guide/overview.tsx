import { getCatalog, type CatalogLevel } from "@/features/guide/catalog";

const PROGRAMS = [
  { code: "cambridge", name: "Cambridge", noun: "chủ đề" },
  { code: "global_success", name: "Global Success", noun: "Unit" },
] as const;

/** Fallback outline when the catalogue cannot be read (e.g. before migration 0024). */
const FALLBACK: CatalogLevel[] = [
  { level: "STARTERS", name: "Starters", program: "cambridge", topics: [] },
  { level: "MOVERS", name: "Movers", program: "cambridge", topics: [] },
  { level: "FLYERS", name: "Flyers", program: "cambridge", topics: [] },
  { level: "GS1", name: "Global Success 1", program: "global_success", topics: [] },
];

const SHOWN = 5;

/** "Tổng quan bài luyện": programme → level → topics, from live data (D37). */
export async function GuideOverview() {
  const catalog = (await getCatalog()) ?? FALLBACK;
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" data-testid="guide-overview">
      <h2 className="text-xl font-semibold">Tổng quan bài luyện</h2>
      <p className="mt-1 text-ink-soft">Chương trình → Trình độ → Chủ đề / Unit → Bài</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {PROGRAMS.map((p) => {
          const levels = catalog.filter((l) => l.program === p.code);
          return (
            <div key={p.code} className="rounded-lg border border-line bg-paper p-4">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {levels.map((l) => {
                  const activities = l.topics.reduce((n, t) => n + t.activities, 0);
                  const short = l.name.replace("Global Success ", "G");
                  return (
                    <li key={l.level}>
                      <p className="font-semibold">
                        {short}{" "}
                        <span className="font-normal text-ink-soft">
                          {l.topics.length
                            ? `· ${l.topics.length} ${p.noun} · ${activities} bài`
                            : "· sắp có"}
                        </span>
                      </p>
                      {l.topics.length ? (
                        <p className="text-sm text-ink-soft">
                          {l.topics
                            .slice(0, SHOWN)
                            .map((t) => t.title)
                            .join(", ")}
                          {l.topics.length > SHOWN ? `… và ${l.topics.length - SHOWN} ${p.noun} khác` : ""}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm">
        Mỗi chủ đề / Unit có khoảng 10–12 bài, gồm 12 dạng theo 4 kỹ năng: <b>Từ vựng · Nghe · Đọc · Viết</b>{" "}
        và <b>Bài tổng hợp</b>.
      </p>
    </section>
  );
}
