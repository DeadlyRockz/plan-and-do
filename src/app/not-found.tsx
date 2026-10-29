import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <PageContainer className="flex flex-col items-start gap-4 py-16 sm:py-24">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Page not found
        </h1>
        <p className="max-w-prose text-base text-muted-foreground">
          That address doesn’t match any page here.
        </p>
        <Link href="/" className={buttonVariants()}>
          Go to the start
        </Link>
      </PageContainer>
    </main>
  );
}
