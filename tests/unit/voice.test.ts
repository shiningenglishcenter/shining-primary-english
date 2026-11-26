import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildRound } from "@/features/practice/round";
import type { PracticeKind, VocabWord } from "@/features/practice/model";
import { activityTexts, normText, spokenTexts, voiceKey, voicePath, voicesOf } from "@/features/practice/voice";
import { buildPack, PACKS } from "../../scripts/content-v2-lib.mts";
import type { Pack } from "../../content/v2/types.mts";

describe("recorded voice (D67)", () => {
  it("names a text's file by its words, not its spacing", () => {
    const k = voiceKey("This is a  T-shirt. ");
    expect(k).toMatch(/^[0-9a-f]{28}$/);
    expect(voiceKey("This is a T-shirt.")).toBe(k);
    expect(voiceKey("This is a T-shirt!")).not.toBe(k);
    expect(voicePath("cat")).toBe(`emma/${voiceKey("cat")}.mp3`);
  });

  it("uses a teacher's recording only when it is well formed", () => {
    const own = "custom/0b6f3d2e-6a49-4c1e-9a43-1f1e7c3a9d10.webm";
    const voices = voicesOf({ [voiceKey("cat")]: own, nope: own, [voiceKey("dog")]: "emma/x.mp3" });
    expect(voices).toEqual({ [voiceKey("cat")]: own });
    expect(voicePath("cat", voices)).toBe(own);
    expect(voicePath("dog", voices)).toBe(`emma/${voiceKey("dog")}.mp3`);
  });

  // Every sentence a real (random) round reads aloud must be in the list the
  // voice files are made from, or it would fall back to the device voice.
  for (const [file, mod] of PACKS.slice(0, 3)) {
    it(`${file}: the voice list covers what rounds read aloud`, async () => {
      const pack = ((await import(pathToFileURL(resolve(process.cwd(), "scripts", mod)).href)) as { PACK: Pack })
        .PACK;
      const words = new Map<string, VocabWord[]>(
        pack.units.map((u) => [
          u.code,
          u.words.map((w) => {
            const [word = "", meaningVi = "", emoji = ""] = w.split("|").map((s) => s.trim());
            return { word, meaningVi, emoji: emoji || null };
          }),
        ]),
      );
      const missing: string[] = [];
      for (const a of buildPack(file, pack).acts) {
        const list = words.get(a.where.split("/")[1] ?? "") ?? [];
        const texts = new Set(activityTexts(a.kind as PracticeKind, a.content, list));
        for (let i = 0; i < 15; i++) {
          const round = buildRound(a.kind as PracticeKind, a.content, list);
          for (const q of round.questions)
            for (const t of spokenTexts(q)) if (!texts.has(normText(t))) missing.push(`${a.where}: ${t}`);
        }
      }
      expect([...new Set(missing)].slice(0, 10)).toEqual([]);
    });
  }
});
