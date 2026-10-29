"use client";

import { CalendarBlankIcon, FolderOpenIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import Link from "next/link";
import { SPACE, TYPE } from "@/components/styles";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toLocalIsoDate } from "@/domain/dates";
import { EVENT_TYPE_LABELS } from "@/domain/event-types";
import { DeletePlanDialog, deletePlanWithUndo } from "@/features/shared/delete-plan";
import { EVENT_TYPE_ICONS, eventTitle } from "@/features/shared/event-meta";
import { useStorageNotices } from "@/features/shared/storage-notices";
import { formatCount, formatDate } from "@/lib/format";
import { usePlans } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";

/** Saved plans in this browser, newest first (plan/08 §8.1 S3). */
export function SavedPlansList() {
  const plans = usePlans();
  useStorageNotices(plans !== null);

  if (plans === null) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <p className="sr-only">Loading saved plans</p>
        <Skeleton className="h-24 rounded-xl sm:rounded-2xl" />
        <Skeleton className="h-24 rounded-xl sm:rounded-2xl" />
      </div>
    );
  }
  if (plans.length === 0) return <EmptyState />;
  return (
    <ul className="flex flex-col gap-3">
      {plans.map((plan) => (
        <SavedPlanRow key={plan.id} plan={plan} />
      ))}
    </ul>
  );
}

function SavedPlanRow({ plan }: { plan: SavedPlan }) {
  const title = eventTitle(plan.brief);
  const TypeIcon = EVENT_TYPE_ICONS[plan.brief.eventType];
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl",
        SPACE.surface,
      )}
    >
      <div className="flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <TypeIcon size={22} weight="duotone" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className={TYPE.cardTitle}>
            <Link
              href={`/plan/${plan.id}`}
              className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {title}
            </Link>
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li>
              <Badge>{EVENT_TYPE_LABELS[plan.brief.eventType]}</Badge>
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarBlankIcon size={16} aria-hidden="true" />
              {formatDate(plan.brief.eventDate)}
            </li>
            <li className="flex items-center gap-1.5">
              <UsersIcon size={16} aria-hidden="true" />
              {formatCount(plan.brief.guestCount)} guests
            </li>
            <li>Updated {formatDate(toLocalIsoDate(new Date(plan.updatedAt)))}</li>
          </ul>
        </div>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <Link
          href={`/plan/${plan.id}`}
          className={buttonVariants({ variant: "outline" })}
          aria-label={`Open ${title}`}
        >
          Open
        </Link>
        <DeletePlanDialog planTitle={title} onConfirm={() => deletePlanWithUndo(plan)}>
          <Button variant="ghost" aria-label={`Delete ${title}`}>
            <TrashIcon size={18} aria-hidden="true" />
            Delete
          </Button>
        </DeletePlanDialog>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-xl border border-dashed sm:rounded-2xl",
        SPACE.surface,
      )}
    >
      <FolderOpenIcon
        size={40}
        weight="duotone"
        aria-hidden="true"
        className="text-muted-foreground"
      />
      <h2 className={TYPE.groupTitle}>No saved plans yet</h2>
      <p className={cn(TYPE.secondary, "max-w-prose")}>
        Every plan you make is saved here automatically, in this browser.
      </p>
      <Link href="/#plan-form-title" className={buttonVariants()}>
        Plan my event
      </Link>
    </div>
  );
}
