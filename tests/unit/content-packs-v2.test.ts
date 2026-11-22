import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { contentSchemaFor, PRACTICE_KINDS, type PracticeKind } from "@/features/practice/model";
import { buildPack, PACKS } from "../../scripts/content-v2-lib.mts";
import type { Pack } from "../../content/v2/types.mts";

/** D60: every generated activity must pass the app's own content check. */
describe("content packs v2", () => {
  for (const [file, mod] of PACKS) {
    const url = pathToFileURL(resolve(process.cwd(), "scripts", mod));
    if (!existsSync(url)) continue;
    it(`${file}: no problems, every activity valid`, async () => {
      const pack = ((await import(url.href)) as { PACK: Pack }).PACK;
      const { acts, problems } = buildPack(file, pack);
      expect(problems).toEqual([]);
      const bad = acts.flatMap((a) => {
        if (!(PRACTICE_KINDS as readonly string[]).includes(a.kind)) return [`${a.where}: unknown kind ${a.kind}`];
        const r = contentSchemaFor(a.kind as PracticeKind).safeParse(a.content);
        return r.success ? [] : [`${a.where}: ${r.error.issues[0]?.message} at ${r.error.issues[0]?.path.join(".")}`];
      });
      expect(bad).toEqual([]);
    });
  }
});
