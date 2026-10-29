// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import type { SavedPlan } from "@/lib/storage";
import { ChatPanel } from "../chat-panel";

const requestRefine = vi.fn();
vi.mock("@/lib/api-client", () => ({ requestRefine: (input: unknown) => requestRefine(input) }));
const update = vi.fn();
vi.mock("@/lib/plan-store", () => ({
  planStore: { update: (...args: unknown[]) => update(...args), takeNotices: () => [] },
}));

const brief = EventBriefSchema.parse({
  eventType: "community",
  subtype: "cleanup",
  eventDate: "2027-02-14",
  guestCount: 80,
  budget: { amount: 900, currency: "USD" },
});
const plan: SavedPlan = {
  schemaVersion: 1,
  id: "p1",
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
  plannedOn: "2026-10-29",
  brief,
  progress: { milestones: [], vendors: [] },
  chat: [],
};

afterEach(() => {
  requestRefine.mockReset();
  update.mockReset();
});

describe("ChatPanel", () => {
  it("sends_the_message_with_text_only_history_and_saves_the_reply", async () => {
    requestRefine.mockResolvedValue({ ok: true, reply: "Done.", brief, briefChanged: false });
    const user = userEvent.setup();
    render(<ChatPanel plan={plan} today="2026-10-29" disabled={false} />);
    await user.type(screen.getByLabelText("Your message"), "What should I book first?");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect([requestRefine.mock.calls[0]?.[0].message, update.mock.calls[0]?.[0]]).toEqual([
      "What should I book first?",
      "p1",
    ]);
  });

  it("announces_the_reply_politely", async () => {
    requestRefine.mockResolvedValue({
      ok: true,
      reply: "Book the venue first.",
      brief,
      briefChanged: false,
    });
    const user = userEvent.setup();
    render(<ChatPanel plan={plan} today="2026-10-29" disabled={false} />);
    await user.type(screen.getByLabelText("Your message"), "Help{Enter}");
    expect(await screen.findByText("Planner: Book the venue first.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("shows_the_error_and_keeps_the_draft_when_the_request_fails", async () => {
    requestRefine.mockResolvedValue({
      ok: false,
      code: "AI_UNAVAILABLE",
      message: "The assistant is unavailable right now.",
    });
    const user = userEvent.setup();
    render(<ChatPanel plan={plan} today="2026-10-29" disabled={false} />);
    await user.type(screen.getByLabelText("Your message"), "Make it 100 guests{Enter}");
    expect([
      await screen.findByText(/unavailable right now/),
      screen.getByLabelText("Your message"),
    ]).toEqual([expect.anything(), expect.objectContaining({ value: "Make it 100 guests" })]);
  });

  it("disables_changes_for_past_events", () => {
    render(<ChatPanel plan={plan} today="2027-03-01" disabled />);
    expect(screen.queryByLabelText("Your message")).toBeNull();
  });
});
