"use client";

import {
  CalendarBlankIcon,
  MapPinIcon,
  PrinterIcon,
  TrashIcon,
  UsersIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { EventBrief } from "@/domain/brief";
import type { PlanContext } from "@/domain/context";
import type { IsoDate } from "@/domain/dates";
import { EVENT_TYPE_LABELS } from "@/domain/event-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatCountdown, formatDate, formatMoney, moneyFromMajor } from "@/lib/format";
import { DeletePlanDialog } from "@/features/shared/delete-plan";
import { EVENT_TYPE_ICONS } from "@/features/shared/event-meta";
import { MODE_STATUS, StatusBadge } from "@/features/shared/status-badges";
import { TYPE } from "@/components/styles";

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
      <h1 className={TYPE.pageTitle}>{title}</h1>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-base">
        <Fact icon={CalendarBlankIcon} label="Date">
          {formatDate(brief.eventDate)}
          <span className="text-muted-foreground"> ({formatCountdown(today, brief.eventDate)})</span>
        </Fact>
        <Fact icon={UsersIcon} label="Guests">
          {formatCount(brief.guestCount)} guests
        </Fact>
        <Fact icon={WalletIcon} label="Budget">
          {formatMoney(moneyFromMajor(brief.budget.amount, brief.budget.currency))}
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
        <DeletePlanDialog planTitle={title} onConfirm={onDelete}>
          <Button variant="ghost">
            <TrashIcon size={18} aria-hidden="true" />
            Delete plan
          </Button>
        </DeletePlanDialog>
      </div>
    </header>
  );
}

function Fact({
  icon: FactIcon,
  label,
  children,
}: {
  icon: Icon;
  label: string;
  children: ReactNode;
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
