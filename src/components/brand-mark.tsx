import { ConfettiIcon } from "@phosphor-icons/react/ssr";

/** The Occasio mark: the confetti glyph on the brand green. */
export function BrandMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <ConfettiIcon size={20} weight="bold" aria-hidden="true" />
    </span>
  );
}
