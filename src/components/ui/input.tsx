import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base text-ink placeholder:text-ink-soft/70",
        "focus-visible:border-sky focus-visible:ring-3 focus-visible:ring-sky/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-berry aria-invalid:ring-berry/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
