import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

/**
 * Status pills. Text sits on an opaque card surface so its contrast is fixed (rule 9.4), and
 * every status badge is paired with an icon at the call site: colour is never the only signal.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border text-muted-foreground",
        primary: "border-primary text-primary",
        warning: "border-warning text-warning",
        destructive: "border-destructive text-destructive",
        solid: "border-primary bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
