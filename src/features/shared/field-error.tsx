import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

/** An error message under a control, marked with an icon as well as colour (plan/08 §8.4). */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm font-medium text-destructive">
      <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      {children}
    </p>
  );
}
