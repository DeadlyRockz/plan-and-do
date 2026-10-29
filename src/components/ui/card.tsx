import { cn } from "cn";
import * as React from "react";
import { SPACE } from "@/components/styles";

/** A raised surface: one radius and one padding for every card (rules 9.2 and 9.6). */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card text-card-foreground sm:rounded-2xl",
        SPACE.surface,
        className,
      )}
      {...props}
    />
  );
}

export { Card };
