import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { SPACE } from "@/components/styles";
import { cn } from "cn";

export default function Loading() {
  return (
    <main id="main" aria-busy="true">
      <PageContainer className={cn("flex flex-col gap-6", SPACE.pageY)}>
        <p className="sr-only">Loading</p>
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-80 rounded-2xl" />
      </PageContainer>
    </main>
  );
}
