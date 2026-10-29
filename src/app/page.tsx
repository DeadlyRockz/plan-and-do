import { PageContainer } from "@/components/page-container";
import { Card } from "@/components/ui/card";
import { Hero } from "@/features/intake/hero";
import { IntakeForm } from "@/features/intake/intake-form";
import { WhatYouGet } from "@/features/intake/what-you-get";
import { SPACE, TYPE } from "@/components/styles";
import { cn } from "cn";

export const metadata = { title: "Plan your event" };

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero today={today} />
      <section aria-labelledby="plan-form-title" className={cn("border-t", SPACE.sectionY)}>
        <PageContainer className="grid grid-cols-1 gap-10 lg:grid-cols-8 lg:gap-12">
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="flex flex-col gap-3">
              <h2
                id="plan-form-title"
                tabIndex={-1}
                className={cn(
                  TYPE.sectionTitle,
                  "scroll-mt-6 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                Tell us about your event
              </h2>
              <p className={cn(TYPE.lead, "text-muted-foreground")}>
                Two short steps, then an optional one. It takes about two minutes.
              </p>
            </div>
            <Card>
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
