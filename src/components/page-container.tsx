import { cn } from "cn";
import type { ComponentProps } from "react";

/** The page gutter and max width from rule 9.2 and plan/08 §8.3. */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12", className)}
      {...props}
    />
  );
}
