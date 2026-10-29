"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import type { PlanIdeas } from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";
import { briefFingerprint } from "@/domain/fingerprint";
import { isAbortError, requestIdeas } from "@/lib/api-client";
import { planStore } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";
import { retryWindowFrom, type RetryWindow } from "@/features/shared/use-countdown";

type IdeasError = { status: "error"; message: string; retry?: RetryWindow };

export type IdeasState =
  | { status: "loading" }
  | { status: "idle" }
  | IdeasError
  | { status: "ready"; ideas: PlanIdeas; isDemo: boolean; isStale: boolean };

/** A request in flight or one that failed; `null` once the stored ideas are the answer. */
type RequestState = { status: "loading" } | IdeasError | null;

type Outcome = { ok: true } | { ok: false; message: string; retry?: RetryWindow } | "aborted";

/**
 * Claude's ideas for a plan (plan/04 §4.3 B). Fetched once when a plan has none, then stored
 * with a fingerprint of the brief they were written for. If the brief changes, the old ideas
 * stay visible but are marked out of date until the user refreshes them.
 */
export function useIdeas(plan: SavedPlan, today: IsoDate, isPast: boolean) {
  const [request, setRequest] = useState<RequestState>(null);
  const [announcement, setAnnouncement] = useState("");
  const hasIdeas = plan.ideas !== undefined;

  const settle = useCallback((outcome: Outcome) => {
    if (outcome === "aborted") return;
    setRequest(
      outcome.ok ? null : { status: "error", message: outcome.message, retry: outcome.retry },
    );
    setAnnouncement(outcome.ok ? "Ideas are ready" : "Ideas couldn't be loaded");
  }, []);

  // Reads the latest plan and date without making them effect dependencies: a brief changed by
  // refine keeps its old ideas, marked out of date, until the user asks for new ones.
  const loadMissingIdeas = useEffectEvent((signal: AbortSignal) => loadIdeas(plan, today, signal));

  useEffect(() => {
    if (hasIdeas || isPast) return;
    const controller = new AbortController();
    void loadMissingIdeas(controller.signal).then(settle);
    return () => controller.abort();
  }, [plan.id, hasIdeas, isPast, settle]);

  const refresh = () => {
    setRequest({ status: "loading" });
    setAnnouncement("Loading ideas");
    void loadIdeas(plan, today).then(settle);
  };

  return { state: deriveState(plan, request, isPast), refresh, announcement };
}

/** Fetches ideas for the plan's current brief and saves them with its fingerprint. */
async function loadIdeas(plan: SavedPlan, today: IsoDate, signal?: AbortSignal): Promise<Outcome> {
  const fingerprint = briefFingerprint(plan.brief);
  try {
    const result = await requestIdeas(plan.brief, today, signal);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        retry: retryWindowFrom(result.retryAfterSeconds),
      };
    }
    planStore.update(plan.id, (current) => ({
      ...current,
      ideas: {
        value: result.ideas,
        briefHash: fingerprint,
        promptVersion: result.promptVersion,
        adapter: result.adapter,
      },
    }));
    return { ok: true };
  } catch (error) {
    if (isAbortError(error)) return "aborted";
    throw error;
  }
}

function deriveState(plan: SavedPlan, request: RequestState, isPast: boolean): IdeasState {
  if (request) return request;
  if (plan.ideas) {
    return {
      status: "ready",
      ideas: plan.ideas.value,
      isDemo: plan.ideas.adapter === "mock",
      isStale: plan.ideas.briefHash !== briefFingerprint(plan.brief),
    };
  }
  return isPast ? { status: "idle" } : { status: "loading" };
}
