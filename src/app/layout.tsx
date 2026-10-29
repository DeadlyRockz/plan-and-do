import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleNonce } from "@/components/style-nonce";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// One variable typeface, self-hosted by next/font, so there is no layout shift and no
// third-party request (plan/08 §8.2).
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Plan and Do: organise your celebration", template: "%s | Plan and Do" },
  description:
    "A planning assistant for weddings, birthdays and community events: a budget split, a dated timeline, a vendor checklist and ideas made for you.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the nonce renders every page per request, which the CSP needs (docs/adr/0001).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={geist.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex flex-col">
        <ThemeProvider nonce={nonce}>
          <StyleNonce nonce={nonce} />
          <a
            href="#main"
            className="sr-only z-50 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Skip to main content
          </a>
          <SiteHeader />
          {children}
          <SiteFooter />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
