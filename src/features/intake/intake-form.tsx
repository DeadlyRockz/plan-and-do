"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TYPE } from "@/components/styles";
import { Button } from "@/components/ui/button";
import { planStore } from "@/lib/plan-store";
import { useToday } from "@/lib/use-today";
import { newSavedPlan } from "./create-plan";
import { ErrorSummary } from "./error-summary";
import { EventStep } from "./event-step";
import { INITIAL_VALUES, STEPS, validate, type FieldErrors, type FormValues } from "./form-model";
import { GuestsStep } from "./guests-step";
import { PreferencesStep } from "./preferences-step";
import type { SetField } from "./step-props";

const STEP_COMPONENTS = [EventStep, GuestsStep, PreferencesStep];
const LAST_STEP = STEPS.length - 1;

/**
 * The 3-step intake (plan/08 §8.1). "Next" checks only the fields on screen; the final submit
 * checks everything with the same schema the server uses, then saves the brief and opens the
 * plan, which renders instantly from the rules engine.
 */
export function IntakeForm() {
  const router = useRouter();
  const today = useToday();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const legendRef = useRef<HTMLLegendElement>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Move focus to the new step's legend, but not on first render.
    if (hasNavigated.current) legendRef.current?.focus();
  }, [step]);

  const set: SetField = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
      // Subtypes and priorities depend on the event type.
      ...(field === "eventType" && { subtype: "", priorities: [] }),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    setAttempt((count) => count + 1);
  };

  const goTo = (next: number) => {
    hasNavigated.current = true;
    setErrors({});
    setStep(next);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!today) return;
    if (step < LAST_STEP) {
      const { errors: stepErrors } = validate(values, today, STEPS[step]?.fields);
      if (Object.keys(stepErrors).length > 0) return showErrors(stepErrors);
      return goTo(step + 1);
    }
    const result = validate(values, today);
    if (!result.brief) {
      const firstStepWithError = STEPS.findIndex((candidate) =>
        candidate.fields.some((field) => field in result.errors),
      );
      if (firstStepWithError !== -1 && firstStepWithError !== step) setStep(firstStepWithError);
      return showErrors(result.errors);
    }
    setIsSaving(true);
    const plan = newSavedPlan(result.brief, today);
    planStore.save(plan);
    router.push(`/plan/${plan.id}`);
  };

  const CurrentStep = STEP_COMPONENTS[step] ?? EventStep;
  const current = STEPS[step] ?? STEPS[0];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6" aria-label="Event details">
      <StepProgress step={step} />
      <ErrorSummary errors={errors} attempt={attempt} />
      <fieldset className="flex flex-col gap-6">
        <legend
          ref={legendRef}
          tabIndex={-1}
          className={cn(
            TYPE.groupTitle,
            "mb-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        >
          <span className="sr-only">{`Step ${step + 1} of ${STEPS.length}: `}</span>
          {current.title}
        </legend>
        <p className="text-sm text-muted-foreground">
          {step === LAST_STEP
            ? "Everything on this step is optional, so you can build your plan now."
            : "All fields are required unless marked optional."}
        </p>
        <CurrentStep values={values} errors={errors} set={set} today={today} />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
            <ArrowLeftIcon size={18} aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <Button type="submit" disabled={!today || isSaving}>
          {step < LAST_STEP ? "Next" : isSaving ? "Building your plan" : "Build my plan"}
          <ArrowRightIcon size={18} aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        Step {step + 1} of {STEPS.length}
      </p>
      <ol className="grid grid-cols-3 gap-2" aria-hidden="true">
        {STEPS.map((candidate, index) => (
          <li
            key={candidate.title}
            className={cn("h-1.5 rounded-full", index <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </ol>
    </div>
  );
}
