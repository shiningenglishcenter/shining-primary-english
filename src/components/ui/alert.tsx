import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm leading-relaxed", {
  variants: {
    variant: {
      info: "border-sky/30 bg-sky-soft text-ink",
      success: "border-leaf/30 bg-leaf-soft text-ink",
      destructive: "border-berry/30 bg-berry-soft text-berry",
    },
  },
  defaultVariants: { variant: "info" },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

export { Alert };
