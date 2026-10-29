import { FolderOpenIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { SPACE, TYPE } from "@/components/styles";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/features/shared/notice";

/** Shown while the plan loads from this browser's storage. */
export function PlanLoading() {
  return (
    <main id="main" aria-busy="true" className="outline-none">
      <PageContainer className={cn("flex flex-col gap-6", SPACE.pageY)}>
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

/** No plan with this id is saved in this browser. */
export function PlanNotFound() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className={cn("flex flex-col items-start gap-4", SPACE.pageY)}>
        <FolderOpenIcon
          size={40}
          weight="duotone"
          aria-hidden="true"
          className="text-muted-foreground"
        />
        <h1 className={TYPE.pageTitle}>We couldn’t find that plan</h1>
        <p className={cn(TYPE.lead, "text-muted-foreground")}>
          Plans are saved in the browser they were made in. It may have been deleted, or made on
          another device.
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

/** The saved brief no longer passes the rules engine, so there is no plan to show. */
export function PlanUnreadable() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className={SPACE.pageY}>
        <Notice tone="warning" title="This plan couldn't be rebuilt">
          Its saved details are out of range. You can delete it from Saved plans.
        </Notice>
      </PageContainer>
    </main>
  );
}
