"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SubmitButton } from "@/components/forms/form-parts";
import { Button, type ButtonProps } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  /** One or two sentences: what happens, and whether it can be undone. */
  body?: string;
  /** Default "Xoá". */
  okLabel?: string;
  /** Red OK button (default true: most confirmations are deletions). */
  danger?: boolean;
};

/**
 * A confirmation dialog instead of the browser's confirm(): same look on
 * every device, Vietnamese buttons, "Huỷ" focused so Enter never deletes.
 * Returns the dialog element to render and `ask()`, which resolves to the
 * answer.
 */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const ask = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  useEffect(() => {
    const d = ref.current;
    if (opts && d && !d.open) d.showModal();
  }, [opts]);

  // Leaving the page with the dialog open counts as "Huỷ".
  useEffect(() => () => resolver.current?.(false), []);

  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const danger = opts?.danger ?? true;
  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      data-testid="confirm-dialog"
    >
      {opts ? (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex gap-3">
            {danger ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-berry-soft text-berry">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              <h2 id="confirm-title" className="text-lg font-semibold">
                {opts.title}
              </h2>
              {opts.body ? <p className="text-sm text-ink-soft">{opts.body}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} autoFocus>
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => close(true)}
              className={danger ? "bg-berry text-white hover:bg-berry/90" : undefined}
              data-testid="confirm-ok"
            >
              {opts.okLabel ?? "Xoá"}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );

  return [dialog, ask] as const;
}

/** A form's submit button that asks first; the form is sent only on "OK". */
export function ConfirmSubmit({
  confirm,
  pending,
  pendingText,
  ...props
}: ButtonProps & { pending: boolean; pendingText?: string; confirm: ConfirmOptions | null }) {
  const [dialog, ask] = useConfirm();
  return (
    <>
      <SubmitButton
        pending={pending}
        pendingText={pendingText}
        {...props}
        onClick={async (e) => {
          if (!confirm) return;
          e.preventDefault();
          const button = e.currentTarget;
          if (await ask(confirm)) button.form?.requestSubmit(button);
        }}
      />
      {dialog}
    </>
  );
}
