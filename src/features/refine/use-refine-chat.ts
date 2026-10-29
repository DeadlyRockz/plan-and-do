"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MAX_HISTORY_TURNS, MAX_MESSAGE_CHARACTERS, MAX_TURN_CHARACTERS } from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";
import { requestRefine } from "@/lib/api-client";
import { planStore } from "@/lib/plan-store";
import { MAX_CHAT_TURNS, type SavedPlan } from "@/lib/storage";
import { announceStorageNotices } from "@/features/shared/storage-notices";
import { retryWindowFrom, useCountdown, type RetryWindow } from "@/features/shared/use-countdown";

export type ChatFailure = { message: string; retry?: RetryWindow };

/**
 * One refine turn at a time (plan/06 §6.5). Sends the brief, the last 10 text-only turns and the
 * new message; on success it stores both turns, the follow-ups and any brief change, re-planning
 * from today. A failed message goes back into the draft so the user can resend it.
 */
export function useRefineChat(plan: SavedPlan, today: IsoDate) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const secondsLeft = useCountdown(failure?.retry);

  const send = async (text: string): Promise<void> => {
    const message = text.trim().slice(0, MAX_MESSAGE_CHARACTERS);
    if (!message || pending) return;
    setPending(message);
    setFailure(null);
    setDraft("");
    const result = await requestRefine({
      brief: plan.brief,
      today,
      history: plan.chat.slice(-MAX_HISTORY_TURNS),
      message,
    });
    setPending(null);
    if (!result.ok) {
      setDraft(message);
      setFailure({ message: result.message, retry: retryWindowFrom(result.retryAfterSeconds) });
      return;
    }
    planStore.update(plan.id, (current) => ({
      ...current,
      ...(result.briefChanged && { brief: result.brief, plannedOn: today }),
      chatSuggestions: result.suggestions,
      chat: [
        ...current.chat,
        { role: "user" as const, text: message },
        { role: "assistant" as const, text: result.reply.slice(0, MAX_TURN_CHARACTERS) },
      ].slice(-MAX_CHAT_TURNS),
    }));
    announceStorageNotices();
    setAnnouncement(`Planner: ${result.reply}`);
    if (result.briefChanged) {
      toast.success("Plan updated", {
        description: "The budget, timeline and checklist now reflect your change.",
      });
    }
  };

  return { draft, setDraft, pending, failure, secondsLeft, announcement, send };
}
