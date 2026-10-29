import * as React from "react";
import { cn } from "cn";

/** A raised surface: card radius and padding from rules 9.2 and 9.6. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground sm:rounded-2xl sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
