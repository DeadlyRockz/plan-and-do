import type { IsoDate } from "@/domain/dates";
import type { FieldErrors, FormValues } from "./form-model";

export type SetField = <Field extends keyof FormValues>(
  field: Field,
  value: FormValues[Field],
) => void;

export type StepProps = {
  values: FormValues;
  errors: FieldErrors;
  set: SetField;
  today: IsoDate | undefined;
};
