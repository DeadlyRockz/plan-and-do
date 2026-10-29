import { PageContainer } from "@/components/page-container";
import { SavedPlansList } from "@/features/saved-plans/saved-plans-list";

export const metadata = { title: "Saved plans" };

export default function SavedPlansPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className="flex max-w-4xl flex-col gap-8 py-8 sm:py-12 lg:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Saved plans
          </h1>
          <p className="max-w-prose text-base text-muted-foreground">
            Plans are kept in this browser only. Clearing your site data deletes them.
          </p>
        </div>
        <SavedPlansList />
      </PageContainer>
    </main>
  );
}
