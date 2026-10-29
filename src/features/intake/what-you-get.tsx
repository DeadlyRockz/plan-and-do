import {
  CalendarCheckIcon,
  ListChecksIcon,
  LockSimpleIcon,
  SparkleIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";

const OUTPUTS = [
  {
    icon: WalletIcon,
    title: "A budget that adds up",
    body: "Every line sums to your exact total, weighted towards what matters most to you.",
  },
  {
    icon: CalendarCheckIcon,
    title: "A timeline from your date",
    body: "Worked back from the day itself, and squeezed sensibly if time is short.",
  },
  {
    icon: ListChecksIcon,
    title: "A vendor checklist",
    body: "Who to book, the date to book them by, and the questions to ask.",
  },
  {
    icon: SparkleIcon,
    title: "Ideas made for you",
    body: "Themes, food and tips from Claude that respect your traditions and dietary needs.",
  },
];

/** The four outputs the brief asks for, next to the form so people know what they'll get. */
export function WhatYouGet() {
  return (
    <aside aria-labelledby="what-you-get-title" className="flex flex-col gap-6">
      <h3
        id="what-you-get-title"
        className="text-lg leading-tight font-semibold sm:text-xl lg:text-2xl"
      >
        What you’ll get
      </h3>
      <ul className="flex flex-col gap-5">
        {OUTPUTS.map(({ icon: OutputIcon, title, body }) => (
          <li key={title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <OutputIcon size={20} weight="duotone" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex gap-3 border-t pt-5 text-sm text-muted-foreground">
        <LockSimpleIcon size={20} aria-hidden="true" className="shrink-0" />
        To write ideas, your event details are sent to Anthropic’s Claude API. Plans are saved in
        this browser only; nothing is stored on our server.
      </p>
    </aside>
  );
}
