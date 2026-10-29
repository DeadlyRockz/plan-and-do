import { CalendarBlankIcon, UsersIcon, WalletIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import { EventBriefSchema } from "@/domain/brief";
import { buildPlan } from "@/domain/build-plan";
import { addDays, type IsoDate } from "@/domain/dates";
import { formatDate, formatMoney, formatShare } from "@/domain/money";
import { MODE_STATUS, SEVERITY_STATUS, StatusBadge } from "@/features/shared/status-badges";
import { TYPE } from "@/components/styles";

const SEGMENT_COLOURS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const SAMPLE_LEAD_DAYS = 200;

/**
 * The hero's visual is the product itself: a real plan from the same rules engine the user's
 * brief goes through, for a sample wedding 200 days out. It is server-rendered and ships no JS.
 */
export function SamplePlanPreview({ today }: { today: IsoDate }) {
  const brief = EventBriefSchema.parse({
    eventType: "wedding",
    subtype: "fusion",
    eventName: "Asha & Rohan's wedding",
    eventDate: addDays(today, SAMPLE_LEAD_DAYS),
    guestCount: 120,
    budget: { amount: 1_200_000, currency: "INR" },
    setting: "outdoor",
    priorities: ["catering", "photography"],
  });
  const plan = buildPlan(brief, today);
  // The five largest lines, then everything else as one segment: six legend cells, two columns.
  const topLines = plan.budget.lines.slice(0, 5);
  const rest = plan.budget.lines.slice(5);
  const segments = [
    ...topLines.map((line, index) => ({
      key: line.id,
      label: line.label,
      basisPoints: line.basisPoints,
      minor: line.amount.minor,
      colour: SEGMENT_COLOURS[index],
    })),
    {
      key: "rest",
      label: "Other lines",
      basisPoints: rest.reduce((sum, line) => sum + line.basisPoints, 0),
      minor: rest.reduce((sum, line) => sum + line.amount.minor, 0),
      colour: "bg-muted-foreground",
    },
  ];
  const nextSteps = plan.milestones.slice(0, 3);
  const warning = plan.warnings[0];

  return (
    <figure className="flex flex-col gap-3">
      <div className="rounded-2xl bg-accent p-2 sm:rounded-3xl">
        <div className="flex flex-col gap-6 rounded-lg border bg-card p-4 sm:rounded-2xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className={TYPE.cardTitle}>{brief.eventName}</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CalendarBlankIcon size={16} aria-hidden="true" />
                  {formatDate(brief.eventDate)}
                </li>
                <li className="flex items-center gap-1.5">
                  <UsersIcon size={16} aria-hidden="true" />
                  {brief.guestCount} guests
                </li>
                <li className="flex items-center gap-1.5">
                  <WalletIcon size={16} aria-hidden="true" />
                  {formatMoney(plan.budget.total)}
                </li>
              </ul>
            </div>
            <StatusBadge status={MODE_STATUS[plan.context.mode]} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Budget split</p>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {segments.map((segment) => (
                <span
                  key={segment.key}
                  className={cn("h-full", segment.colour)}
                  style={{ width: `${segment.basisPoints / 100}%` }}
                />
              ))}
            </div>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {segments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", segment.colour)}
                      aria-hidden="true"
                    />
                    {segment.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMoney({ minor: segment.minor, currency: brief.budget.currency })}
                    <span className="sr-only"> ({formatShare(segment.basisPoints)})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 border-t pt-5">
            <p className="text-sm font-medium">Do these first</p>
            <ol className="flex flex-col gap-2 text-sm">
              {nextSteps.map((milestone) => (
                <li key={milestone.id} className="flex items-center justify-between gap-3">
                  <span>{milestone.title}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatDate(milestone.due)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {warning && (
            <div className="flex flex-col gap-2 border-t pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={SEVERITY_STATUS[warning.severity]} />
                <p className="text-sm font-medium">{warning.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{warning.suggestion}</p>
            </div>
          )}
        </div>
      </div>
      <figcaption className="px-2 text-sm text-muted-foreground">
        A sample plan, worked out live by the same rules that will plan yours.
      </figcaption>
    </figure>
  );
}
