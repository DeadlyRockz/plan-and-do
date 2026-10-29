"use client";

import { WarningOctagonIcon } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";

/** The route-level error state. It never shows the error's message, which may be technical. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className="flex flex-col items-start gap-4 py-16 sm:py-24">
        <WarningOctagonIcon
          size={40}
          weight="duotone"
          aria-hidden="true"
          className="text-destructive"
        />
        <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Something went wrong
        </h1>
        <p className="max-w-prose text-base text-muted-foreground">
          Your saved plans are safe in this browser. Try again, and if it keeps happening, reload
          the page.
        </p>
        <Button onClick={reset}>Try again</Button>
      </PageContainer>
    </main>
  );
}
