"use client";

import { ChatCircleTextIcon, FolderOpenIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buildPlan, type PlanSkeleton } from "@/domain/build-plan";
import type { IsoDate } from "@/domain/dates";
import { PageContainer } from "@/components/page-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildCalendar } from "@/lib/ics";
import { planStore, usePlan } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";
import { useMediaQuery } from "@/lib/use-hydrated";
import { useToday } from "@/lib/use-today";
import { ChatPanel } from "@/features/refine/chat-panel";
import { eventTitle } from "@/features/shared/event-meta";
import { Notice } from "@/features/shared/notice";
import { useStorageNotices } from "@/features/shared/storage-notices";
import { BudgetTab } from "./budget-tab";
import { IdeasTab } from "./ideas-tab";
import { OverviewTab } from "./overview-tab";
import { PlanHeader } from "./plan-header";
import { TimelineTab } from "./timeline-tab";
import { useIdeas } from "./use-ideas";
import { VendorsTab } from "./vendors-tab";

const TABS = ["overview", "budget", "timeline", "vendors", "ideas"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  budget: "Budget",
  timeline: "Timeline",
  vendors: "Vendors",
  ideas: "Ideas",
};
// Every panel stays mounted so print can show them all; screen view hides the inactive ones.
const PANEL_CLASS = "data-[state=inactive]:hidden print:data-[state=inactive]:block print:break-before-page";

/** The plan page (plan/08 §8.1 S2). Loads the brief from this browser and rebuilds the plan. */
export function PlanView({ id }: { id: string }) {
  const plan = usePlan(id);
  const today = useToday();
  useStorageNotices(plan !== undefined);

  if (plan === undefined || today === undefined) return <PlanLoading />;
  if (plan === null) return <PlanNotFound />;
  return <PlanDetails plan={plan} today={today} />;
}

function PlanDetails({ plan, today }: { plan: SavedPlan; today: IsoDate }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Rebuilt from the brief and the day it was planned; never stored (plan/04 §4.6).
  const skeleton = useMemo(() => tryBuildPlan(plan), [plan]);
  const isPast = plan.brief.eventDate < today;
  const ideas = useIdeas(plan, today, isPast);
  const title = eventTitle(plan.brief);

  if (!skeleton) {
    return (
      <PageContainer className="py-12">
        <Notice tone="warning" title="This plan couldn't be rebuilt">
          Its saved details are out of range. You can delete it from Saved plans.
        </Notice>
      </PageContainer>
    );
  }

  const setProgress = (key: "milestones" | "vendors", itemId: string, isDone: boolean) =>
    planStore.update(plan.id, (current) => ({
      ...current,
      progress: {
        ...current.progress,
        [key]: isDone
          ? [...new Set([...current.progress[key], itemId])]
          : current.progress[key].filter((value) => value !== itemId),
      },
    }));

  const exportCalendar = () => {
    const calendar = buildCalendar(
      plan.id,
      skeleton.milestones.map((milestone) => ({
        id: milestone.id,
        title: `${milestone.title} (${title})`,
        date: milestone.due,
      })),
      new Date(),
    );
    const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(title)}-timeline.ics`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar file downloaded", { description: "Open it to add every step to your calendar." });
  };

  const deletePlan = () => {
    planStore.remove(plan.id);
    router.push("/plans");
    toast("Plan deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          planStore.save(plan);
          router.push(`/plan/${plan.id}`);
        },
      },
    });
  };

  const readyIdeas = ideas.state.status === "ready" ? ideas.state : undefined;
  const chat = <ChatPanel plan={plan} today={today} disabled={isPast} />;

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <title>{`${title} | Occasio`}</title>
      <PageContainer className="flex flex-col gap-8 py-8 sm:py-12">
        <PlanHeader title={title} brief={plan.brief} context={skeleton.context} today={today} onDelete={deletePlan} />
        {isPast && (
          <Notice title="This event has passed">The plan is kept here for reference.</Notice>
        )}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-8 lg:gap-10">
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="lg:col-span-5">
            <TabsList aria-label="Plan sections" className="print:hidden">
              {TABS.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {TAB_LABELS[value]}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" forceMount className={PANEL_CLASS}>
              <OverviewTab
                brief={plan.brief}
                skeleton={skeleton}
                summary={readyIdeas && !readyIdeas.isStale && !readyIdeas.isDemo ? readyIdeas.ideas.summary : undefined}
                doneMilestones={plan.progress.milestones}
                today={today}
                onShowTimeline={() => setTab("timeline")}
              />
            </TabsContent>
            <TabsContent value="budget" forceMount className={PANEL_CLASS}>
              <BudgetTab
                budget={skeleton.budget}
                guestCount={plan.brief.guestCount}
                perGuest={skeleton.context.perGuest}
                savingIdeas={readyIdeas?.ideas.savingIdeas ?? []}
              />
            </TabsContent>
            <TabsContent value="timeline" forceMount className={PANEL_CLASS}>
              <TimelineTab
                milestones={skeleton.milestones}
                mode={skeleton.context.mode}
                done={plan.progress.milestones}
                today={today}
                onToggle={(itemId, isDone) => setProgress("milestones", itemId, isDone)}
                onExport={exportCalendar}
              />
            </TabsContent>
            <TabsContent value="vendors" forceMount className={PANEL_CLASS}>
              <VendorsTab
                vendors={skeleton.vendors}
                budget={skeleton.budget}
                tips={readyIdeas?.ideas.vendorTips ?? []}
                tipSource={readyIdeas?.isDemo ? "mock" : "claude"}
                booked={plan.progress.vendors}
                today={today}
                onToggle={(itemId, isBooked) => setProgress("vendors", itemId, isBooked)}
              />
            </TabsContent>
            <TabsContent value="ideas" forceMount className={PANEL_CLASS}>
              <IdeasTab state={ideas.state} budget={skeleton.budget} onRefresh={ideas.refresh} />
            </TabsContent>
          </Tabs>

          {isDesktop && (
            <aside aria-label="Ask the planner" className="lg:col-span-3 print:hidden">
              <div className="sticky top-6 rounded-2xl border bg-card p-6">{chat}</div>
            </aside>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {ideas.announcement}
        </p>
      </PageContainer>

      {!isDesktop && (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="fixed right-4 bottom-4 z-30 shadow-lg print:hidden">
              <ChatCircleTextIcon size={20} aria-hidden="true" />
              Ask the planner
            </Button>
          </SheetTrigger>
          <SheetContent aria-describedby="chat-sheet-description" className="overflow-y-auto">
            <SheetTitle className="sr-only">Ask the planner</SheetTitle>
            <SheetDescription id="chat-sheet-description" className="sr-only">
              Change the plan or ask a question in plain words.
            </SheetDescription>
            {chat}
          </SheetContent>
        </Sheet>
      )}
    </main>
  );
}

function tryBuildPlan(plan: SavedPlan): PlanSkeleton | undefined {
  try {
    return buildPlan(plan.brief, plan.plannedOn);
  } catch {
    return undefined;
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event"
  );
}

function PlanLoading() {
  return (
    <main id="main" aria-busy="true" className="outline-none">
      <PageContainer className="flex flex-col gap-6 py-8 sm:py-12">
        <p className="sr-only">Loading your plan</p>
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-8">
          <Skeleton className="h-96 rounded-2xl lg:col-span-5" />
          <Skeleton className="hidden h-96 rounded-2xl lg:col-span-3 lg:block" />
        </div>
      </PageContainer>
    </main>
  );
}

function PlanNotFound() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className="flex flex-col items-start gap-4 py-16 sm:py-24">
        <FolderOpenIcon size={40} weight="duotone" aria-hidden="true" className="text-muted-foreground" />
        <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          We couldn’t find that plan
        </h1>
        <p className="max-w-prose text-base text-muted-foreground">
          Plans are saved in the browser they were made in. It may have been deleted, or made on another
          device.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/#plan-form-title" className={buttonVariants()}>
            Plan my event
          </Link>
          <Link href="/plans" className={buttonVariants({ variant: "outline" })}>
            Saved plans
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
