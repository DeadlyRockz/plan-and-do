import { ArrowDownIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";
import { PageContainer } from "@/components/page-container";
import { SPACE, TYPE } from "@/components/styles";
import { Button } from "@/components/ui/button";
import type { IsoDate } from "@/domain/dates";
import { SamplePlanPreview } from "./sample-plan-preview";

/** Asymmetric split hero: the promise on the left, a live sample plan on the right. */
export function Hero({ today }: { today: IsoDate }) {
  return (
    <section aria-labelledby="hero-title">
      <PageContainer
        className={cn(
          "grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12",
          SPACE.sectionY,
        )}
      >
        <div className="animate-rise flex flex-col gap-6 lg:col-span-6">
          <h1 id="hero-title" className={TYPE.display}>
            Plan your event in minutes
          </h1>
          <p className={cn(TYPE.lead, "text-muted-foreground")}>
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
