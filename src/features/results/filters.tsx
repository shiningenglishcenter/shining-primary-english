"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export type FilterField = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/**
 * Results filters (D32): changing any of them applies it at once (client
 * navigation, so the progress bar shows). Sorting is kept; paging restarts.
 * Without JavaScript the form still works through its submit button.
 */
export function ResultsFilters({
  base,
  fields,
  keep,
}: {
  base: string;
  fields: FilterField[];
  /** Other params to carry over (e.g. sort). */
  keep: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams(keep);
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v) params.set(k, v);
    params.delete("page");
    start(() => router.push(`${base}?${params}`));
  };
  return (
    <form
      method="get"
      action={base}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="mb-6 flex flex-wrap items-end gap-3"
      data-testid="results-filters"
    >
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm font-medium">
          {f.label}
          <select
            name={f.name}
            defaultValue={f.value}
            onChange={(e) => apply(e.currentTarget.form!)}
            className="h-10 min-w-40 rounded-md border border-line bg-surface px-3 text-sm"
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {pending ? (
        <Loader2 className="mb-2.5 size-5 animate-spin text-ink-soft" aria-label="Đang lọc" />
      ) : null}
      <noscript>
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white">
          Xem
        </button>
      </noscript>
    </form>
  );
}
