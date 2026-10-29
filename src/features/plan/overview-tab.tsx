import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { EventBrief } from "@/domain/brief";
import type { PlanSkeleton } from "@/domain/build-plan";
import type { IsoDate } from "@/domain/dates";
import type { Warning } from "@/domain/warnings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/domain/event-types";
import { SEVERITY_STATUS, StatusBadge } from "@/features/shared/status-badges";
import { GroupHeading, PanelHeading } from "./panel-heading";
import { SPACE, TYPE } from "@/components/styles";
import { cn } from "cn";

type OverviewProps = {
  brief: EventBrief;
  skeleton: PlanSkeleton;
  summary: string | undefined;
  doneMilestones: readonly string[];
  today: IsoDate;
  onShowTimeline: () => void;
};

export function OverviewTab({ brief, skeleton, summary, doneMilestones, today, onShowTimeline }: OverviewProps) {
  const nextUp = skeleton.milestones
    .filter((milestone) => !milestone.isPostEvent && !doneMilestones.includes(milestone.id))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <PanelHeading>Overview</PanelHeading>
      <p className={TYPE.lead}>{summary ?? rulesSummary(brief, skeleton)}</p>

      <section aria-labelledby="warnings-title" className="flex flex-col gap-4">
        <GroupHeading id="warnings-title">Worth your attention</GroupHeading>
        {skeleton.warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now. Your plan looks balanced.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {skeleton.warnings.map((warning) => (
              <WarningItem key={warning.id} warning={warning} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="next-up-title" className="flex flex-col gap-4">
        <GroupHeading id="next-up-title">Next up</GroupHeading>
        {nextUp.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every step before the event is done. Enjoy the day.</p>
        ) : (
          <ol className="flex flex-col divide-y rounded-xl border bg-card sm:rounded-2xl">
            {nextUp.map((milestone) => (
              <li key={milestone.id} className={cn("flex flex-wrap items-center justify-between gap-2", SPACE.row)}>
                <span className="font-medium">{milestone.title}</span>
                <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                  {milestone.due < today && <Badge variant="destructive">Overdue</Badge>}
                  {formatDate(milestone.due)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="print:hidden">
          <Button variant="outline" onClick={onShowTimeline}>
            See the full timeline
            <ArrowRightIcon size={18} aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function WarningItem({ warning }: { warning: Warning }) {
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={SEVERITY_STATUS[warning.severity]} />
          <h4 className={TYPE.cardTitle}>{warning.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{warning.reason}</p>
        <p className="text-sm">{warning.suggestion}</p>
      </Card>
    </li>
  );
}

function rulesSummary(brief: EventBrief, skeleton: PlanSkeleton): string {
  return `A ${EVENT_TYPE_LABELS[brief.eventType].toLowerCase()} for ${brief.guestCount.toLocaleString("en-US")} guests on ${formatDate(brief.eventDate)}, with ${formatMoney(skeleton.context.perGuest)} to spend per guest.`;
}
