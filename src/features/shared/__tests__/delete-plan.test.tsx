// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import type { SavedPlan } from "@/lib/storage";
import { DeletePlanDialog, UNDO_WINDOW_MS, deletePlanWithUndo } from "../delete-plan";

type ToastOptions = { duration: number; action: { label: string; onClick: () => void } };

const toast = vi.fn();
vi.mock("sonner", () => ({ toast: (...args: unknown[]) => toast(...args) }));
const remove = vi.fn();
const save = vi.fn();
vi.mock("@/lib/plan-store", () => ({
  planStore: {
    remove: (...args: unknown[]) => remove(...args),
    save: (...args: unknown[]) => save(...args),
  },
}));

const plan: SavedPlan = {
  schemaVersion: 1,
  id: "p1",
  createdAt: "2026-10-29T00:00:00.000Z",
  updatedAt: "2026-10-29T00:00:00.000Z",
  plannedOn: "2026-10-29",
  brief: EventBriefSchema.parse({
    eventType: "birthday",
    subtype: "adult",
    eventDate: "2026-12-12",
    guestCount: 30,
    budget: { amount: 600, currency: "EUR" },
  }),
  progress: { milestones: ["send-invites"], vendors: ["venue"] },
  chat: [{ role: "user", text: "Hi" }],
};

function undoAction(): ToastOptions["action"] {
  return (toast.mock.calls[0]?.[1] as ToastOptions).action;
}

function renderDialog(onConfirm = vi.fn()) {
  render(
    <DeletePlanDialog planTitle="Adult party" onConfirm={onConfirm}>
      <button type="button">Delete</button>
    </DeletePlanDialog>,
  );
  return { onConfirm, user: userEvent.setup() };
}

afterEach(() => {
  toast.mockReset();
  remove.mockReset();
  save.mockReset();
});

describe("deletePlanWithUndo", () => {
  it("removes_the_plan_and_offers_undo_for_a_few_seconds", () => {
    deletePlanWithUndo(plan);
    const [message, options] = toast.mock.calls[0] as [string, ToastOptions];
    expect([remove.mock.calls, message, options.duration, options.action.label]).toEqual([
      [["p1"]],
      "Plan deleted",
      UNDO_WINDOW_MS,
      "Undo",
    ]);
  });

  it("undo_puts_the_same_plan_back_and_runs_the_callback", () => {
    const onUndo = vi.fn();
    deletePlanWithUndo(plan, onUndo);
    undoAction().onClick();
    expect([save.mock.calls[0]?.[0], onUndo.mock.calls.length]).toEqual([plan, 1]);
  });

  it("undo_works_without_a_callback", () => {
    deletePlanWithUndo(plan);
    undoAction().onClick();
    expect(save.mock.calls).toEqual([[plan]]);
  });
});

describe("DeletePlanDialog", () => {
  it("asks_for_confirmation_when_the_trigger_is_pressed", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByRole("alertdialog", { name: "Delete Adult party?" }),
    ).toHaveAccessibleDescription(
      "It will be removed from this browser. You can undo for a few seconds afterwards.",
    );
  });

  it("keep_it_closes_without_deleting", async () => {
    const { onConfirm, user } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect([screen.queryByRole("alertdialog"), onConfirm.mock.calls.length]).toEqual([null, 0]);
  });

  it("delete_plan_confirms_and_closes", async () => {
    const { onConfirm, user } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    expect([screen.queryByRole("alertdialog"), onConfirm.mock.calls.length]).toEqual([null, 1]);
  });
});
