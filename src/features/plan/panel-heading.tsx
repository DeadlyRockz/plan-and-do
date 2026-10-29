import type { ReactNode } from "react";

/** Each tab panel's heading: hidden on screen (the tab names it) but printed with the plan. */
export function PanelHeading({ children }: { children: ReactNode }) {
  return <h2 className="sr-only print:not-sr-only print:mb-4 print:text-2xl print:font-semibold">{children}</h2>;
}

/** A group heading inside a panel. */
export function GroupHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-lg leading-tight font-semibold sm:text-xl">
      {children}
    </h3>
  );
}
