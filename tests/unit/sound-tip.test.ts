import { describe, expect, it } from "vitest";
import { soundTipFor } from "@/features/practice/use-sound";

/** C4 (D40): "turn the sound on" tip. */
describe("soundTipFor", () => {
  it("asks for sound when the browser keeps audio suspended or has none", () => {
    expect(soundTipFor({ ctxState: "suspended", ios: false, iosTipSeen: false })).toBe("blocked");
    expect(soundTipFor({ ctxState: "unavailable", ios: true, iosTipSeen: true })).toBe("blocked");
  });
  it("tells iPhone/iPad users about the silent switch once per device", () => {
    expect(soundTipFor({ ctxState: "running", ios: true, iosTipSeen: false })).toBe("ios");
    expect(soundTipFor({ ctxState: "running", ios: true, iosTipSeen: true })).toBeNull();
  });
  it("stays quiet when sound works", () => {
    expect(soundTipFor({ ctxState: "running", ios: false, iosTipSeen: false })).toBeNull();
  });
});
