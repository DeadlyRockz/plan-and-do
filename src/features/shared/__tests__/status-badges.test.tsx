// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MODE_STATUS, SEVERITY_STATUS, StatusBadge } from "../status-badges";

describe("StatusBadge", () => {
  it("pairs_every_status_with_a_text_label_and_a_hidden_icon", () => {
    const statuses = [...Object.values(SEVERITY_STATUS), ...Object.values(MODE_STATUS)];
    const rendered = statuses.map((status) => {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const badge = [
        container.textContent,
        container.querySelector("svg")?.getAttribute("aria-hidden"),
      ];
      unmount();
      return badge;
    });
    expect(rendered).toEqual([
      ["Critical", "true"],
      ["Warning", "true"],
      ["Note", "true"],
      ["On track", "true"],
      ["Compressed", "true"],
      ["Urgent", "true"],
    ]);
  });

  it("styles_the_badge_by_its_status_variant", () => {
    const { container } = render(<StatusBadge status={MODE_STATUS.urgent} />);
    expect(container.firstElementChild).toHaveClass("border-destructive");
  });
});
