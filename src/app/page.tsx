import { PageContainer } from "@/components/page-container";
import { Card } from "@/components/ui/card";
import { Hero } from "@/features/intake/hero";
import { IntakeForm } from "@/features/intake/intake-form";
import { WhatYouGet } from "@/features/intake/what-you-get";

export const metadata = { title: "Plan your event" };

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero today={today} />
      <section aria-labelledby="plan-form-title" className="border-t py-12 sm:py-16 lg:py-24">
        <PageContainer className="grid grid-cols-1 gap-10 lg:grid-cols-8 lg:gap-12">
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="flex flex-col gap-3">
              <h2
                id="plan-form-title"
                tabIndex={-1}
                className="scroll-mt-6 rounded-md text-2xl leading-tight font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-3xl lg:text-4xl"
              >
                Tell us about your event
              </h2>
              <p className="max-w-prose text-base text-muted-foreground">
                Two short steps, then an optional one. It takes about two minutes.
              </p>
            </div>
            <Card className="lg:p-8">
              <IntakeForm />
            </Card>
          </div>
          <div className="lg:col-span-3 lg:pt-20">
            <WhatYouGet />
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
