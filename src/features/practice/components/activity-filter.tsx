"use client";

import { useSyncExternalStore } from "react";
import { useLang, useT } from "@/features/i18n/client";
import { DIFFICULTY_EN, DIFFICULTY_VI, type Difficulty } from "@/features/practice/model";

export type ActivityFilterKey = "all" | Difficulty | "todo" | "done";
const KEYS: ActivityFilterKey[] = ["all", "easy", "medium", "hard", "todo", "done"];
const STORE = "shining-activity-filter";

let memory: ActivityFilterKey = "all";
const listeners = new Set<() => void>();
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function readFilter(): ActivityFilterKey {
  try {
    const saved = window.localStorage.getItem(STORE) as ActivityFilterKey | null;
    return saved && KEYS.includes(saved) ? saved : memory;
  } catch {
    return memory;
  }
}

function saveFilter(k: ActivityFilterKey) {
  try {
    window.localStorage.setItem(STORE, k);
  } catch {
    memory = k; // storage blocked: remember for this page only
  }
  listeners.forEach((l) => l());
}

/**
 * A dropdown above a unit's activities: by difficulty, or done / not done. The
 * list itself is server-rendered; this only sets `data-filter` on it, and
 * CSS hides the rest (globals.css). Remembered on this device.
 */
export function ActivityFilter({
  counts,
  children,
}: {
  counts: Record<ActivityFilterKey, number>;
  children: React.ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const filter = useSyncExternalStore(subscribe, readFilter, () => "all" as const);
  const pick = saveFilter;
  const label = (k: ActivityFilterKey) =>
    k === "all"
      ? t.filterAll
      : k === "todo"
        ? t.filterTodo
        : k === "done"
          ? t.filterDone
          : (lang === "vi" ? DIFFICULTY_VI : DIFFICULTY_EN)[k];

  return (
    <div className="mt-6" data-filter={filter} data-testid="activity-filter">
      <label className="flex items-center justify-end gap-2 text-[15px] font-black text-k-soft">
        {t.filterLabel}
        <select
          value={filter}
          onChange={(e) => pick(e.target.value as ActivityFilterKey)}
          data-testid="activity-filter-select"
          className="kid-press h-11 cursor-pointer rounded-full border-2 border-k-line bg-k-surface pr-3 pl-4 text-[16px] font-black text-k-ink"
        >
          {KEYS.map((k) => (
            <option key={k} value={k}>
              {label(k)} ({counts[k]})
            </option>
          ))}
        </select>
      </label>
      {children}
      {counts[filter] === 0 ? (
        <p
          className="mt-4 rounded-3xl bg-k-surface p-6 text-center font-bold text-k-soft"
          data-testid="filter-empty"
        >
          {t.filterEmpty}
        </p>
      ) : null}
    </div>
  );
}
