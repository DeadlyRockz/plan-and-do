/** Moves focus to a field by id, or to the first focusable control inside it (radio groups). */
export function focusField(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const focusable = target.matches("input, select, textarea, button, [tabindex]")
    ? target
    : target.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
  (focusable ?? target).focus();
  target.scrollIntoView({ block: "center", behavior: "smooth" });
}
