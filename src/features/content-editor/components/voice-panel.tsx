"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Mic, Square, Undo2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/browser";
import { saveVoice } from "@/features/content-editor/actions";
import { useSound } from "@/features/practice/use-sound";
import {
  CUSTOM_VOICE_MAX_BYTES,
  CUSTOM_VOICE_TYPES,
  VOICE_BUCKET,
  voiceKey,
  type Voices,
} from "@/features/practice/voice";

const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_SECONDS = 60;

/**
 * Recorded voice (D67) of one topic's or activity's sentences: listen, record
 * your own voice, upload a file, or go back to the default voice. A recording
 * is used only here (this topic / this activity).
 */
export function VoicePanel({
  target,
  id,
  texts,
  voices,
  title,
}: {
  target: "topic" | "activity";
  id: string;
  texts: string[];
  voices: Voices;
  title: string;
}) {
  const sound = useSound({ voices });
  const [dialog, ask] = useConfirm();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<{ key: string; stop: () => void } | null>(null);
  const [take, setTake] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const fileFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const custom = texts.filter((t) => voices[voiceKey(t)]).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? texts.filter((t) => t.toLowerCase().includes(q)) : texts;
  }, [texts, query]);

  const store = async (key: string, blob: Blob) => {
    setError(null);
    const type = blob.type.split(";")[0] ?? "";
    const ext = CUSTOM_VOICE_TYPES[type];
    if (!ext) return setError("Chỉ nhận file mp3, m4a, webm, ogg hoặc wav.");
    if (blob.size > CUSTOM_VOICE_MAX_BYTES) return setError("File lớn hơn 2 MB. Hãy cắt ngắn lại.");
    setBusy(key);
    const path = `custom/${crypto.randomUUID()}.${ext}`;
    const bucket = createClient().storage.from(VOICE_BUCKET);
    const { error: upError } = await bucket.upload(path, blob, { contentType: type, upsert: false });
    if (upError) {
      setBusy(null);
      return setError("Không tải lên được. Vui lòng thử lại.");
    }
    const res = await saveVoice({ target, id, key, path });
    if (!res.ok) {
      await bucket.remove([path]);
      setError(res.error ?? "Không lưu được.");
    }
    setBusy(null);
    setTake(null);
  };

  const record = async (key: string) => {
    setError(null);
    setTake(null);
    const type = RECORDER_TYPES.find(
      (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
    );
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("Không mở được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.");
    }
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => parts.push(e.data);
    const timer = window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SECONDS * 1000);
    rec.onstop = () => {
      window.clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(parts, { type: (rec.mimeType || type || "audio/webm").split(";")[0] });
      setRecording(null);
      setTake({ key, blob, url: URL.createObjectURL(blob) });
    };
    rec.start();
    setRecording({ key, stop: () => rec.stop() });
  };

  const reset = async (key: string) => {
    const ok = await ask({
      title: "Về giọng mặc định?",
      body: "Bản thu của thầy cô cho câu này sẽ bị xoá.",
      okLabel: "Về mặc định",
    });
    if (!ok) return;
    setBusy(key);
    const res = await saveVoice({ target, id, key, path: null });
    if (!res.ok) setError(res.error ?? "Không lưu được.");
    setBusy(null);
  };

  if (texts.length === 0) return null;
  return (
    <details className="rounded-xl border border-line bg-surface" data-testid="voice-panel">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        🔊 {title} ({texts.length} câu{custom ? ` · ${custom} câu thầy cô tự thu` : ""})
      </summary>
      {dialog}
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <p className="text-sm text-ink-soft">
          App đọc các câu này bằng giọng Emma (Anh–Anh); câu mới soạn có giọng Emma sau khi chạy lệnh tạo
          giọng (trước đó là giọng máy). Thầy cô có thể tự thu hoặc tải file cho từng câu — chỉ dùng trong{" "}
          {target === "topic" ? "chủ đề" : "bài"} này.
        </p>
        {texts.length > 8 ? (
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm câu…" />
        ) : null}
        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && fileFor.current) void store(fileFor.current, f);
          }}
        />
        <ul className="flex max-h-[28rem] flex-col divide-y divide-line overflow-y-auto">
          {shown.map((text) => {
            const key = voiceKey(text);
            const own = Boolean(voices[key]);
            const isRec = recording?.key === key;
            const mine = take?.key === key ? take : null;
            return (
              <li key={key} className="flex flex-col gap-2 py-2" data-testid="voice-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm" lang="en">
                    {text}
                    {own ? (
                      <span className="ml-2 rounded-full bg-sky-soft px-2 py-0.5 text-xs font-semibold">
                        Giọng thầy cô
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => sound.speak(text)}
                    title="Nghe"
                  >
                    <Volume2 className="size-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Nghe</span>
                  </Button>
                  {isRec ? (
                    <Button type="button" size="sm" variant="destructive" onClick={recording.stop}>
                      <Square className="size-4" aria-hidden="true" /> Dừng
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(recording) || busy !== null}
                      onClick={() => void record(key)}
                      data-testid="voice-record"
                    >
                      <Mic className="size-4" aria-hidden="true" />
                      <span className="sr-only sm:not-sr-only">Thu âm</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(recording) || busy !== null}
                    onClick={() => {
                      fileFor.current = key;
                      fileInput.current?.click();
                    }}
                    data-testid="voice-upload"
                  >
                    {busy === key ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="size-4" aria-hidden="true" />
                    )}
                    <span className="sr-only sm:not-sr-only">Tải file</span>
                  </Button>
                  {own ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => void reset(key)}
                      data-testid="voice-reset"
                    >
                      <Undo2 className="size-4" aria-hidden="true" />
                      <span className="sr-only sm:not-sr-only">Mặc định</span>
                    </Button>
                  ) : null}
                </div>
                {mine ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2">
                    <audio controls src={mine.url} className="h-9 max-w-full" />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void store(key, mine.blob)}
                      disabled={busy !== null}
                    >
                      Lưu bản thu
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setTake(null)}>
                      Huỷ
                    </Button>
                  </div>
                ) : null}
                {isRec ? (
                  <p className="text-xs font-semibold text-destructive">● Đang thu… bấm Dừng khi đọc xong.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
