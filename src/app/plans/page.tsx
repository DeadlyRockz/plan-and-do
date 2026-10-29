import { cn } from "cn";
import { PageContainer } from "@/components/page-container";
import { SPACE, TYPE } from "@/components/styles";
import { SavedPlansList } from "@/features/saved-plans/saved-plans-list";

export const metadata = { title: "Saved plans" };

export default function SavedPlansPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className={cn("flex max-w-4xl flex-col gap-8", SPACE.pageY)}>
        <div className="flex flex-col gap-3">
          <h1 className={TYPE.pageTitle}>Saved plans</h1>
          <p className={cn(TYPE.lead, "text-muted-foreground")}>
            Plans are kept in this browser only. Clearing your site data deletes them.
          </p>
        </div>
        <SavedPlansList />
      </PageContainer>
    </main>
  );
}
