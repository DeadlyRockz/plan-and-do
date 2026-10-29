"use client";

import { ChatCircleTextIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { buildPlan, type PlanSkeleton } from "@/domain/build-plan";
import type { IsoDate } from "@/domain/dates";
import { isOneOf, slugify } from "@/domain/text";
import { PageContainer } from "@/components/page-container";
import { SPACE } from "@/components/styles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadTextFile } from "@/lib/download";
import { buildCalendar } from "@/lib/ics";
import { planStore, usePlan } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";
import { useMediaQuery } from "@/lib/use-hydrated";
import { useToday } from "@/lib/use-today";
import { ChatPanel } from "@/features/refine/chat-panel";
import { deletePlanWithUndo } from "@/features/shared/delete-plan";
import { eventTitle } from "@/features/shared/event-meta";
import { Notice } from "@/features/shared/notice";
import { useStorageNotices } from "@/features/shared/storage-notices";
import { cn } from "cn";
import { BudgetTab } from "./budget-tab";
import { IdeasTab } from "./ideas-tab";
import { OverviewTab } from "./overview-tab";
import { PlanHeader } from "./plan-header";
import { PlanLoading, PlanNotFound, PlanUnreadable } from "./plan-states";
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
const PANEL_CLASS =
  "data-[state=inactive]:hidden print:data-[state=inactive]:block print:break-before-page";
/** Matches Tailwind's `lg` breakpoint, where the chat moves from a sheet to a side column. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/** The plan page (plan/08 §8.1 S2). Loads the brief from this browser and rebuilds the plan. */
export function PlanView({ id }: { id: string }) {
  const plan = usePlan(id);
  const today = useToday();
  useStorageNotices(plan !== undefined);
  // Rebuilt from the brief and the day it was planned; never stored (plan/04 §4.6).
  const skeleton = useMemo(() => (plan ? tryBuildPlan(plan) : undefined), [plan]);

  if (plan === undefined || today === undefined) return <PlanLoading />;
  if (plan === null) return <PlanNotFound />;
  if (!skeleton) return <PlanUnreadable />;
  return <PlanDetails plan={plan} skeleton={skeleton} today={today} />;
}

type PlanDetailsProps = { plan: SavedPlan; skeleton: PlanSkeleton; today: IsoDate };

function PlanDetails({ plan, skeleton, today }: PlanDetailsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isPast = plan.brief.eventDate < today;
  const ideas = useIdeas(plan, today, isPast);
  const title = eventTitle(plan.brief);
  const readyIdeas = ideas.state.status === "ready" ? ideas.state : undefined;
  // Demo and out-of-date summaries describe a different brief, so the overview leaves them out.
  const summary =
    readyIdeas && !readyIdeas.isStale && !readyIdeas.isDemo ? readyIdeas.ideas.summary : undefined;

  const exportCalendar = () => {
    const entries = skeleton.milestones.map((milestone) => ({
      id: milestone.id,
      title: `${milestone.title} (${title})`,
      date: milestone.due,
    }));
    downloadTextFile(
      `${slugify(title)}-timeline.ics`,
      buildCalendar(plan.id, entries, new Date()),
      "text/calendar;charset=utf-8",
    );
    toast.success("Calendar file downloaded", {
      description: "Open it to add every step to your calendar.",
    });
  };

  const deletePlan = () => {
    deletePlanWithUndo(plan, () => router.push(`/plan/${plan.id}`));
    router.push("/plans");
  };

  const chat = <ChatPanel plan={plan} today={today} disabled={isPast} />;

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <title>{`${title} | Plan and Do`}</title>
      <PageContainer className={cn("flex flex-col gap-8", SPACE.pageY)}>
        <PlanHeader
          title={title}
          brief={plan.brief}
          context={skeleton.context}
          today={today}
          onDelete={deletePlan}
        />
        {isPast && (
          <Notice title="This event has passed">The plan is kept here for reference.</Notice>
        )}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-8 lg:gap-10">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (isOneOf(TABS, value)) setTab(value);
            }}
            className="lg:col-span-5"
          >
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
                summary={summary}
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
                onToggle={(itemId, isDone) =>
                  planStore.setProgress(plan.id, "milestones", itemId, isDone)
                }
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
                onToggle={(itemId, isBooked) =>
                  planStore.setProgress(plan.id, "vendors", itemId, isBooked)
                }
              />
            </TabsContent>
            <TabsContent value="ideas" forceMount className={PANEL_CLASS}>
              <IdeasTab state={ideas.state} budget={skeleton.budget} onRefresh={ideas.refresh} />
            </TabsContent>
          </Tabs>

          {isDesktop && (
            <aside aria-label="Ask the planner" className="lg:col-span-3 print:hidden">
              <Card className="sticky top-6">{chat}</Card>
            </aside>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {ideas.announcement}
        </p>
      </PageContainer>

      {!isDesktop && <ChatSheet>{chat}</ChatSheet>}
    </main>
  );
}

/** On small screens the chat opens from a floating button as a side sheet. */
function ChatSheet({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed right-4 bottom-4 z-30 shadow-lg print:hidden">
          <ChatCircleTextIcon size={20} aria-hidden="true" />
          Ask the planner
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby="chat-sheet-description" className="overflow-y-auto">
        <SheetTitle className="sr-only">Ask the planner</SheetTitle>
        <SheetDescription id="chat-sheet-description" className="sr-only">
          Change the plan or ask a question in plain words.
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** The plan for a saved brief, or `undefined` if the brief no longer passes the rules engine. */
function tryBuildPlan(plan: SavedPlan): PlanSkeleton | undefined {
  try {
    return buildPlan(plan.brief, plan.plannedOn);
  } catch {
    return undefined;
  }
}
