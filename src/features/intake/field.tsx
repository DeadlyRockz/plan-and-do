import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { fieldId, type FieldName } from "./form-model";

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  field: FieldName;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (control: ControlProps) => ReactNode;
};

/** Label above, hint, the control, then the error below it, all wired by id (plan/08 §8.4). */
export function Field({ field, label, hint, error, optional, children }: FieldProps) {
  const id = fieldId(field);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children({
        id,
        ...(describedBy && { "aria-describedby": describedBy }),
        ...(error && { "aria-invalid": true as const }),
      })}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm font-medium text-destructive">
      <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      {children}
    </p>
  );
}

/** A group of related controls (radios, checkboxes) with a visible legend. */
export function FieldGroup({
  field,
  legend,
  hint,
  error,
  optional,
  children,
}: {
  field: FieldName;
  legend: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const id = fieldId(field);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={describedBy || undefined}>
      <legend className="text-sm leading-tight font-medium">
        {legend}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <div id={id}>{children}</div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </fieldset>
  );
}
