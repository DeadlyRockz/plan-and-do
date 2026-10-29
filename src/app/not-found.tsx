import { cn } from "cn";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { SPACE, TYPE } from "@/components/styles";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className={cn("flex flex-col items-start gap-4", SPACE.pageY)}>
        <h1 className={TYPE.pageTitle}>Page not found</h1>
        <p className={cn(TYPE.lead, "text-muted-foreground")}>
          That address doesn’t match any page here.
        </p>
        <Link href="/" className={buttonVariants()}>
          Go to the start
        </Link>
      </PageContainer>
    </main>
  );
}
