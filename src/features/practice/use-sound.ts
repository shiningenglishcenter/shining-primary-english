"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MUTE_KEY = "shining-sound-off";

/**
 * Reads English aloud with the device's own voice (free; owner decision
 * 2026-11-10 — pre-recorded voices may come later) and plays short
 * soft effect sounds generated with Web Audio (no sound files, D34).
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

  /**
   * Tiny synthesiser (D34): soft notes with a bell-like decay, played one
   * after another (`at` = start offset in seconds). Quiet on purpose: these
   * sit under the voice and must never startle a child.
   */
  const play = useCallback(
    (notes: { f: number; at: number; dur: number; type?: OscillatorType; vol?: number; to?: number }[]) => {
      if (muted || typeof window === "undefined") return;
      try {
        ctxRef.current ??= new AudioContext();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const t0 = ctx.currentTime + 0.01;
        for (const n of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = n.type ?? "sine";
          osc.frequency.setValueAtTime(n.f, t0 + n.at);
          if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
          const peak = n.vol ?? 0.12;
          gain.gain.setValueAtTime(0.0001, t0 + n.at);
          gain.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t0 + n.at);
          osc.stop(t0 + n.at + n.dur + 0.02);
        }
      } catch {
        /* audio unavailable */
      }
    },
    [muted],
  );

  /** Soft "tock" for any tap on a button. */
  const tap = useCallback(
    () => play([{ f: 900, to: 600, at: 0, dur: 0.06, type: "triangle", vol: 0.05 }]),
    [play],
  );
  /** Bright two-bell chime: C6 → G6, with a quiet octave shimmer. */
  const correct = useCallback(
    () =>
      play([
        { f: 1047, at: 0, dur: 0.35 },
        { f: 1568, at: 0.09, dur: 0.5 },
        { f: 3136, at: 0.09, dur: 0.3, vol: 0.03 },
      ]),
    [play],
  );
  /** Gentle "bloop" that slides down — a nudge, not a buzzer. */
  const wrong = useCallback(
    () => play([{ f: 392, to: 262, at: 0, dur: 0.28, type: "triangle", vol: 0.09 }]),
    [play],
  );
  /** Little sparkle when a hint opens. */
  const hint = useCallback(
    () =>
      play([
        { f: 1760, at: 0, dur: 0.12, type: "triangle", vol: 0.05 },
        { f: 2349, at: 0.06, dur: 0.12, type: "triangle", vol: 0.05 },
        { f: 2794, at: 0.12, dur: 0.2, type: "triangle", vol: 0.05 },
      ]),
    [play],
  );
  /** Soft rising swish when the next question slides in. */
  const swish = useCallback(() => play([{ f: 500, to: 1100, at: 0, dur: 0.16, vol: 0.03 }]), [play]);
  /** One "ding" per star on the results screen; higher for each star. */
  const star = useCallback(
    (i: number) =>
      play([
        { f: [1319, 1568, 2093][i] ?? 2093, at: 0, dur: 0.45, vol: 0.1 },
        { f: ([1319, 1568, 2093][i] ?? 2093) * 2, at: 0, dur: 0.25, vol: 0.025 },
      ]),
    [play],
  );
  /** End-of-round tune: C–E–G–C arpeggio over a soft chord. */
  const fanfare = useCallback(
    () =>
      play([
        { f: 523, at: 0, dur: 0.2 },
        { f: 659, at: 0.13, dur: 0.2 },
        { f: 784, at: 0.26, dur: 0.2 },
        { f: 1047, at: 0.39, dur: 0.7, vol: 0.13 },
        { f: 262, at: 0.39, dur: 0.8, type: "triangle", vol: 0.05 },
        { f: 330, at: 0.39, dur: 0.8, type: "triangle", vol: 0.04 },
        { f: 392, at: 0.39, dur: 0.8, type: "triangle", vol: 0.04 },
      ]),
    [play],
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
    () => ({ speak, tap, correct, wrong, hint, swish, star, fanfare, muted, toggleMute }),
    [speak, tap, correct, wrong, hint, swish, star, fanfare, muted, toggleMute],
  );
}
