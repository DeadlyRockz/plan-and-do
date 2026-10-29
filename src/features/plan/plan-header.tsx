"use client";

import {
  CalendarBlankIcon,
  MapPinIcon,
  PrinterIcon,
  TrashIcon,
  UsersIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";
import type { EventBrief } from "@/domain/brief";
import type { PlanContext } from "@/domain/context";
import type { IsoDate } from "@/domain/dates";
import { EVENT_TYPE_LABELS } from "@/domain/event-types";
import { formatMoney } from "@/domain/money";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCountdown, formatDate } from "@/lib/format";
import { EVENT_TYPE_ICONS } from "@/features/shared/event-meta";
import { MODE_STATUS, StatusBadge } from "@/features/shared/status-badges";

type PlanHeaderProps = {
  title: string;
  brief: EventBrief;
  context: PlanContext;
  today: IsoDate;
  onDelete: () => void;
};

export function PlanHeader({ title, brief, context, today, onDelete }: PlanHeaderProps) {
  const TypeIcon = EVENT_TYPE_ICONS[brief.eventType];
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          <TypeIcon size={14} weight="bold" aria-hidden="true" />
          {EVENT_TYPE_LABELS[brief.eventType]}
        </Badge>
        <StatusBadge status={MODE_STATUS[context.mode]} />
      </div>
      <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{title}</h1>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:text-base">
        <Fact icon={CalendarBlankIcon} label="Date">
          {formatDate(brief.eventDate)}
          <span className="text-muted-foreground"> ({formatCountdown(today, brief.eventDate)})</span>
        </Fact>
        <Fact icon={UsersIcon} label="Guests">
          {brief.guestCount.toLocaleString("en-US")} guests
        </Fact>
        <Fact icon={WalletIcon} label="Budget">
          {formatMoney({ minor: Math.round(brief.budget.amount * 100), currency: brief.budget.currency })}
        </Fact>
        {brief.location && (
          <Fact icon={MapPinIcon} label="Location">
            {brief.location}
          </Fact>
        )}
      </dl>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon size={18} aria-hidden="true" />
          Print or save PDF
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost">
              <TrashIcon size={18} aria-hidden="true" />
              Delete plan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from this browser. You can undo for a few seconds afterwards.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete plan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}

function Fact({
  icon: FactIcon,
  label,
  children,
}: {
  icon: typeof CalendarBlankIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex items-center text-muted-foreground">
        <FactIcon size={18} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
