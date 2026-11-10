"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MUTE_KEY = "shining-sound-off";

/**
 * Reads English aloud with the device's own voice (free; owner decision
 * 2026-11-10 — pre-recorded voices may come later) and plays short
 * "correct"/"try again" tones generated with Web Audio (no sound files).
 */
export function useSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    try {
      // Restoring a per-device preference after mount (localStorage is client-only).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      /* storage blocked: keep sound on */
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const byLang = (lang: string) =>
        voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang));
      const gb = byLang("en-gb");
      const us = byLang("en-us");
      const en = byLang("en");
      // Prefer natural/online voices when the device offers them.
      const nice = (list: SpeechSynthesisVoice[]) =>
        list.find((v) => /natural|neural|online|enhanced|premium|google/i.test(v.name)) ?? list[0];
      voiceRef.current = nice(gb) ?? nice(us) ?? nice(en) ?? null;
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  const speak = useCallback((text: string, rate = 0.85) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceRef.current?.lang ?? "en-GB";
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  }, []);

  const tone = useCallback(
    (notes: [number, number][]) => {
      if (muted || typeof window === "undefined") return;
      try {
        ctxRef.current ??= new AudioContext();
        const ctx = ctxRef.current;
        let t = ctx.currentTime;
        for (const [freq, dur] of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + dur);
          t += dur * 0.8;
        }
      } catch {
        /* audio unavailable */
      }
    },
    [muted],
  );

  const correct = useCallback(
    () =>
      tone([
        [660, 0.12],
        [880, 0.18],
      ]),
    [tone],
  );
  const wrong = useCallback(
    () =>
      tone([
        [300, 0.18],
        [240, 0.22],
      ]),
    [tone],
  );
  const fanfare = useCallback(
    () =>
      tone([
        [523, 0.14],
        [659, 0.14],
        [784, 0.14],
        [1047, 0.3],
      ]),
    [tone],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({ speak, correct, wrong, fanfare, muted, toggleMute }),
    [speak, correct, wrong, fanfare, muted, toggleMute],
  );
}
