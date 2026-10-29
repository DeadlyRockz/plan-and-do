"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import type { Budget } from "@/domain/budget";
import type { PlanIdeas } from "@/domain/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/features/shared/notice";
import { useCountdown } from "@/features/shared/use-countdown";
import { GroupHeading, PanelHeading } from "./panel-heading";
import type { IdeasState } from "./use-ideas";

/** Claude's ideas, with every state the call can be in (plan/08 §8.1, rule 9.8). */
export function IdeasTab({ state, budget, onRefresh }: { state: IdeasState; budget: Budget; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <PanelHeading>Ideas</PanelHeading>
      {state.status === "loading" && <IdeasSkeleton />}
      {state.status === "idle" && (
        <Notice title="This event has passed">New ideas aren’t generated for past events.</Notice>
      )}
      {state.status === "error" && <IdeasError message={state.message} retryAt={state.retryAt} onRetry={onRefresh} />}
      {state.status === "ready" && (
        <>
          {state.isDemo && (
            <Notice title="Demo mode: these are sample ideas">
              The server has no Claude API key, so these come from fixed examples. Add a key for ideas
              written for your event.
            </Notice>
          )}
          {state.isStale && (
            <Notice
              tone="warning"
              title="Your plan changed after these ideas were written"
              action={
                <Button variant="outline" onClick={onRefresh} className="shrink-0 print:hidden">
                  <ArrowClockwiseIcon size={18} aria-hidden="true" />
                  Refresh ideas
                </Button>
              }
            />
          )}
          <IdeasContent ideas={state.ideas} budget={budget} />
        </>
      )}
    </div>
  );
}

function IdeasContent({ ideas, budget }: { ideas: PlanIdeas; budget: Budget }) {
  const featured = ideas.themes.length === 3;
  return (
    <>
      <p className="max-w-prose text-base lg:text-lg">{ideas.summary}</p>

      <section aria-labelledby="themes-title" className="flex flex-col gap-4">
        <GroupHeading id="themes-title">Themes</GroupHeading>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ideas.themes.map((theme, index) => (
            <li key={theme.name} className={cn(featured && index === 0 && "md:col-span-2")}>
              <Card className="h-full gap-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base leading-tight font-semibold">{theme.name}</h4>
                  <Badge variant={theme.budgetFit === "fits" ? "primary" : "warning"}>
                    {theme.budgetFit === "fits" ? "Fits your budget" : "Stretches the budget"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
                <div className={cn("grid grid-cols-1 gap-4", featured && index === 0 && "sm:grid-cols-3")}>
                  <IdeaList title="Decor" items={theme.decor} />
                  <IdeaList title="Food and drink" items={theme.foodAndDrink} />
                  <IdeaList title="Activities" items={theme.activities} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {ideas.savingIdeas.length > 0 && (
        <section aria-labelledby="saving-title" className="flex flex-col gap-4">
          <GroupHeading id="saving-title">Ways to save</GroupHeading>
          <ul className="flex flex-col divide-y rounded-xl border bg-card sm:rounded-2xl">
            {ideas.savingIdeas.map((idea) => (
              <li key={`${idea.budgetLineId}-${idea.idea}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                <Badge className="sm:mt-0.5">{budget.lines.find((line) => line.id === idea.budgetLineId)?.label}</Badge>
                <span className="text-sm">{idea.idea}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ideas.considerations.length > 0 && (
        <section aria-labelledby="considerations-title" className="flex flex-col gap-4">
          <GroupHeading id="considerations-title">Worth keeping in mind</GroupHeading>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            {ideas.considerations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function IdeaList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{title}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function IdeasSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Writing ideas for your event. Your plan is ready to use meanwhile.</p>
      <Skeleton className="h-6 w-3/4" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl sm:rounded-2xl md:col-span-2" />
        <Skeleton className="h-48 rounded-xl sm:rounded-2xl" />
        <Skeleton className="h-48 rounded-xl sm:rounded-2xl" />
      </div>
    </div>
  );
}

function IdeasError({ message, retryAt, onRetry }: { message: string; retryAt?: number; onRetry: () => void }) {
  const secondsLeft = useCountdown(retryAt);
  return (
    <Notice
      tone="warning"
      title="Ideas aren't available right now"
      action={
        <Button variant="outline" onClick={onRetry} disabled={secondsLeft > 0} className="shrink-0">
          <ArrowClockwiseIcon size={18} aria-hidden="true" />
          {secondsLeft > 0 ? `Try again in ${secondsLeft}s` : "Try again"}
        </Button>
      }
    >
      {message} Your budget, timeline and vendor checklist are complete without them.
    </Notice>
  );
}
