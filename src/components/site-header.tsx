import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b print:hidden">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-lg text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandMark />
          Occasio
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/plans"
            className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-lg"
          >
            Saved plans
          </Link>
          <ThemeToggle />
        </nav>
      </PageContainer>
    </header>
  );
}
