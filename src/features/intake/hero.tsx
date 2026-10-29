import { ArrowDownIcon } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import type { IsoDate } from "@/domain/dates";
import { SamplePlanPreview } from "./sample-plan-preview";

/** Asymmetric split hero: the promise on the left, a live sample plan on the right. */
export function Hero({ today }: { today: IsoDate }) {
  return (
    <section aria-labelledby="hero-title">
      <PageContainer className="grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
        <div className="animate-rise flex flex-col gap-6 lg:col-span-6">
          <h1
            id="hero-title"
            className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Plan your event in minutes
          </h1>
          <p className="max-w-prose text-base text-muted-foreground lg:text-lg">
            Share your date, guests and budget. Get a budget split, dated timeline, vendor checklist
            and ideas made for you.
          </p>
          <div>
            <Button asChild size="lg">
              <a href="#plan-form-title">
                Plan my event
                <ArrowDownIcon size={18} aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
        <div className="animate-rise-late lg:col-span-6">
          <SamplePlanPreview today={today} />
        </div>
      </PageContainer>
    </section>
  );
}
