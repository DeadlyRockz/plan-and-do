import { InfoIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import type { ReactNode } from "react";

/** A callout for messages that need attention. Text sits on the opaque card surface. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const ToneIcon = tone === "warning" ? WarningIcon : InfoIcon;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl",
        tone === "warning" ? "border-warning" : "border-primary",
        className,
      )}
    >
      <div className="flex gap-3">
        <ToneIcon
          size={20}
          weight="bold"
          aria-hidden="true"
          className={cn("mt-px shrink-0", tone === "warning" ? "text-warning" : "text-primary")}
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{title}</p>
          {children && <div className="text-sm text-muted-foreground">{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
