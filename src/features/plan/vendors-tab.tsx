"use client";

import { SparkleIcon, WarningOctagonIcon } from "@phosphor-icons/react/ssr";
import type { Budget } from "@/domain/budget";
import type { PlanIdeas } from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";
import type { VendorItem } from "@/domain/vendors";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { PanelHeading } from "./panel-heading";
import { TYPE } from "@/components/styles";

type VendorsProps = {
  vendors: readonly VendorItem[];
  budget: Budget;
  tips: PlanIdeas["vendorTips"];
  tipSource: "claude" | "mock";
  booked: readonly string[];
  today: IsoDate;
  onToggle: (id: string, booked: boolean) => void;
};

export function VendorsTab({ vendors, budget, tips, tipSource, booked, today, onToggle }: VendorsProps) {
  return (
    <div className="flex flex-col gap-4">
      <PanelHeading>Vendors</PanelHeading>
      <p className="text-sm text-muted-foreground">
        {booked.length} of {vendors.length} booked. Each one is on the list for a reason, with the date to
        book by and what to ask.
      </p>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {vendors.map((vendor) => (
          <li key={vendor.id}>
            <VendorCard
              vendor={vendor}
              lineLabel={budget.lines.find((line) => line.id === vendor.budgetLineId)?.label}
              tip={tips.find((item) => item.vendorId === vendor.id)?.tip}
              tipSource={tipSource}
              isBooked={booked.includes(vendor.id)}
              today={today}
              onToggle={onToggle}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function VendorCard({
  vendor,
  lineLabel,
  tip,
  tipSource,
  isBooked,
  today,
  onToggle,
}: {
  vendor: VendorItem;
  lineLabel: string | undefined;
  tip: string | undefined;
  tipSource: "claude" | "mock";
  isBooked: boolean;
  today: IsoDate;
  onToggle: (id: string, booked: boolean) => void;
}) {
  const checkboxId = `vendor-${vendor.id}`;
  const isOverdue = !isBooked && vendor.bookBy < today;
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className={TYPE.cardTitle}>{vendor.label}</h3>
        <div className="-mt-3 -mr-1 flex min-h-11 shrink-0 items-center gap-2">
          <Checkbox id={checkboxId} checked={isBooked} onCheckedChange={(next) => onToggle(vendor.id, next === true)} />
          <Label htmlFor={checkboxId} className="font-normal">
            Booked
          </Label>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{vendor.why}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <dt className="text-muted-foreground">Book by</dt>
          <dd className="font-medium tabular-nums">{formatDate(vendor.bookBy)}</dd>
          {isOverdue && (
            <Badge variant="destructive">
              <WarningOctagonIcon size={12} weight="bold" aria-hidden="true" />
              Overdue
            </Badge>
          )}
        </div>
        {lineLabel && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Paid from</dt>
            <dd>{lineLabel}</dd>
          </div>
        )}
      </dl>
      {tip && (
        <p className="flex gap-2 border-l border-primary pl-3 text-sm">
          <SparkleIcon size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="font-medium">{tipSource === "mock" ? "Sample tip: " : "Tip: "}</span>
            {tip}
          </span>
        </p>
      )}
      <details className="mt-auto border-t pt-3 text-sm print:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-md font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          Questions to ask ({vendor.questions.length})
        </summary>
        <ol className="mt-1 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
          {vendor.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </details>
      {/* Closed <details> never print, so the printed plan gets its own copy of the questions. */}
      <div className="hidden text-sm print:block">
        <p className="font-medium">Questions to ask</p>
        <ol className="mt-1 list-decimal pl-5">
          {vendor.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
