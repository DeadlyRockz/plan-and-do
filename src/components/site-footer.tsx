import { PageContainer } from "@/components/page-container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t print:hidden">
      <PageContainer className="flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>Occasio plans weddings, birthdays and community events.</p>
        <p>Plans stay in this browser. Costs are rules of thumb, not quotes.</p>
      </PageContainer>
    </footer>
  );
}
