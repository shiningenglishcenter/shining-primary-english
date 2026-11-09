import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native select styled like Input: works with forms, keyboards and phones. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-12 w-full min-w-0 appearance-none rounded-md border border-input bg-surface pr-10 pl-3 text-base text-ink",
          "focus-visible:border-sky focus-visible:ring-3 focus-visible:ring-sky/25 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-berry aria-invalid:ring-berry/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
    </div>
  );
}

export { Select };
