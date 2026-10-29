"use client";

import { WarningOctagonIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useRef } from "react";
import { focusField } from "@/lib/focus";
import { fieldId, type FieldErrors, type FieldName } from "./form-model";
import { SPACE, TYPE } from "@/components/styles";
import { cn } from "cn";

/**
 * Lists every error at the top of the form and takes focus when it appears, so keyboard and
 * screen-reader users land on it; each item links to its field (plan/08 §8.1).
 */
export function ErrorSummary({ errors, attempt }: { errors: FieldErrors; attempt: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors) as [FieldName, string][];

  useEffect(() => {
    if (attempt > 0) ref.current?.focus();
  }, [attempt]);

  if (entries.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className={cn(
        "rounded-xl border border-destructive bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-2xl",
        SPACE.surface,
      )}
    >
      <h3
        id="error-summary-title"
        className={cn(TYPE.cardTitle, "flex items-center gap-2 text-destructive")}
      >
        <WarningOctagonIcon size={20} weight="bold" aria-hidden="true" />
        {entries.length === 1 ? "There is a problem" : `There are ${entries.length} problems`}
      </h3>
      <ul className="mt-3 flex flex-col gap-1">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a
              href={`#${fieldId(field)}`}
              onClick={(event) => {
                event.preventDefault();
                focusField(fieldId(field));
              }}
              className="text-sm font-medium text-destructive underline underline-offset-4 hover:no-underline"
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
