import { describe, expect, it } from "vitest";
import { buildIdeasUserMessage, buildRefineUserMessage } from "../prompts";
import { skeletonFor, weddingBrief } from "./fixtures";

type CompactLine = { id: string; share: string; priorityRank?: number };

function compactSkeleton(message: string): { budget: CompactLine[]; vendors: unknown[] } {
  return JSON.parse(/<plan_skeleton>(.*)<\/plan_skeleton>/.exec(message)?.[1] ?? "{}");
}

describe("buildIdeasUserMessage", () => {
  it("includes_a_priority_rank_only_for_ranked_budget_lines", () => {
    const brief = weddingBrief({ priorities: ["catering", "decor"] });
    const { budget } = compactSkeleton(buildIdeasUserMessage(brief, skeletonFor(brief)));
    expect(
      budget.filter((line) => "priorityRank" in line).map((line) => [line.id, line.priorityRank]),
    ).toEqual([
      ["catering", 1],
      ["decor", 2],
    ]);
  });

  it("sends_shares_as_percentages_and_vendors_as_id_and_label_only", () => {
    const brief = weddingBrief();
    const skeleton = skeletonFor(brief);
    const compact = compactSkeleton(buildIdeasUserMessage(brief, skeleton));
    expect([compact.budget[0]?.share, compact.vendors[0]]).toEqual([
      "30%",
      { id: skeleton.vendors[0]?.id, label: skeleton.vendors[0]?.label },
    ]);
  });

  it("puts_the_brief_first_and_the_instruction_last", () => {
    const brief = weddingBrief();
    const lines = buildIdeasUserMessage(brief, skeletonFor(brief)).split("\n");
    expect([lines.length, lines[0], lines[2]]).toEqual([
      3,
      `<event_brief>${JSON.stringify(brief)}</event_brief>`,
      "Write the ideas for this event.",
    ]);
  });
});

describe("buildRefineUserMessage", () => {
  it("wraps_the_brief_and_the_user_message_in_their_own_tags", () => {
    const brief = weddingBrief();
    expect(buildRefineUserMessage(brief, "We're now 80 guests")).toBe(
      `<event_brief>${JSON.stringify(brief)}</event_brief>\n<user_message>We're now 80 guests</user_message>`,
    );
  });
});
