"use client";

import { ConfettiIcon, DownloadSimpleIcon, HourglassIcon, WarningOctagonIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import type { IsoDate } from "@/domain/dates";
import type { PlanMode } from "@/domain/context";
import type { Milestone } from "@/domain/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate, formatMonth } from "@/lib/format";
import { GroupHeading, PanelHeading } from "./panel-heading";

type TimelineProps = {
  milestones: readonly Milestone[];
  mode: PlanMode;
  done: readonly string[];
  today: IsoDate;
  onToggle: (id: string, done: boolean) => void;
  onExport: () => void;
};

/** Milestones grouped by month, each a checkbox. Urgent mode moves optional steps aside. */
export function TimelineTab({ milestones, mode, done, today, onToggle, onExport }: TimelineProps) {
  const main = milestones.filter((milestone) => !milestone.optional);
  const optional = milestones.filter((milestone) => milestone.optional);
  const completed = milestones.filter((milestone) => done.includes(milestone.id)).length;

  return (
    <div className="flex flex-col gap-6">
      <PanelHeading>Timeline</PanelHeading>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {completed} of {milestones.length} steps done
        </p>
        <Button variant="outline" onClick={onExport} className="print:hidden">
          <DownloadSimpleIcon size={18} aria-hidden="true" />
          Add to calendar (.ics)
        </Button>
      </div>

      <MilestoneGroups milestones={main} done={done} today={today} onToggle={onToggle} />

      {mode === "urgent" && optional.length > 0 && (
        <section aria-labelledby="optional-title" className="flex flex-col gap-4 border-t pt-6">
          <GroupHeading id="optional-title">If time allows</GroupHeading>
          <p className="text-sm text-muted-foreground">
            Time is short, so these steps are optional. Do the ones above first.
          </p>
          <MilestoneGroups milestones={optional} done={done} today={today} onToggle={onToggle} />
        </section>
      )}
    </div>
  );
}

function MilestoneGroups({
  milestones,
  done,
  today,
  onToggle,
}: Pick<TimelineProps, "done" | "today" | "onToggle"> & { milestones: readonly Milestone[] }) {
  const months = new Map<string, Milestone[]>();
  for (const milestone of milestones) {
    const month = formatMonth(milestone.due);
    months.set(month, [...(months.get(month) ?? []), milestone]);
  }
  return (
    <div className="flex flex-col gap-6">
      {[...months].map(([month, items]) => (
        <section key={month} aria-label={month} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{month}</h3>
          <ol className="flex flex-col divide-y rounded-xl border bg-card sm:rounded-2xl">
            {items.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                isDone={done.includes(milestone.id)}
                today={today}
                onToggle={onToggle}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function MilestoneRow({
  milestone,
  isDone,
  today,
  onToggle,
}: {
  milestone: Milestone;
  isDone: boolean;
  today: IsoDate;
  onToggle: (id: string, done: boolean) => void;
}) {
  const id = `milestone-${milestone.id}`;
  const isOverdue = !isDone && milestone.due < today;
  const isEventDay = milestone.id === "event-day";
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox id={id} checked={isDone} onCheckedChange={(next) => onToggle(milestone.id, next === true)} />
        <Label htmlFor={id} className={cn("text-base font-normal", isDone && "text-muted-foreground line-through")}>
          {isEventDay && <ConfettiIcon size={18} aria-hidden="true" className="mr-1.5 inline text-primary" />}
          {milestone.title}
        </Label>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
        {isOverdue && (
          <Badge variant="destructive">
            <WarningOctagonIcon size={12} weight="bold" aria-hidden="true" />
            Overdue
          </Badge>
        )}
        {milestone.compressed && (
          <Badge variant="warning">
            <HourglassIcon size={12} weight="bold" aria-hidden="true" />
            Compressed
          </Badge>
        )}
        {milestone.optional && <Badge>Optional</Badge>}
        <span className="text-sm text-muted-foreground tabular-nums">{formatDate(milestone.due)}</span>
      </div>
    </li>
  );
}
