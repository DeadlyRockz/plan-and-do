"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanIdeas } from "@/domain/contracts";
import type { IsoDate } from "@/domain/dates";
import { briefFingerprint } from "@/domain/fingerprint";
import { requestIdeas } from "@/lib/api-client";
import { planStore } from "@/lib/plan-store";
import { retryAtFrom } from "@/features/shared/use-countdown";
import type { SavedPlan } from "@/lib/storage";

export type IdeasState =
  | { status: "loading" }
  | { status: "idle" }
  | { status: "error"; message: string; retryAt?: number }
  | { status: "ready"; ideas: PlanIdeas; isDemo: boolean; isStale: boolean };

type Request = { status: "loading" } | { status: "error"; message: string; retryAt?: number } | null;

/**
 * Claude's ideas for a plan (plan/04 §4.3 B). Fetched once when a plan has none, then stored
 * with a fingerprint of the brief they were written for. If the brief changes, the old ideas
 * stay visible but are marked out of date until the user refreshes them.
 */
export function useIdeas(plan: SavedPlan, today: IsoDate, isPast: boolean) {
  const [request, setRequest] = useState<Request>(null);
  const [announcement, setAnnouncement] = useState("");
  const hasIdeas = plan.ideas !== undefined;

  const settle = useCallback((outcome: Outcome) => {
    if (outcome === "aborted") return;
    setRequest(outcome.ok ? null : { status: "error", message: outcome.message, retryAt: outcome.retryAt });
    setAnnouncement(outcome.ok ? "Ideas are ready" : "Ideas couldn't be loaded");
  }, []);

  useEffect(() => {
    // A plan with no ideas fetches them once; until then deriveState reports "loading". A brief
    // changed by refine keeps its old ideas, marked out of date, until the user refreshes.
    if (hasIdeas || isPast) return;
    const controller = new AbortController();
    loadIdeas(plan, today, controller.signal).then(settle);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per plan, not per brief edit
  }, [plan.id, hasIdeas, isPast]);

  const refresh = () => {
    setRequest({ status: "loading" });
    setAnnouncement("Loading ideas");
    void loadIdeas(plan, today).then(settle);
  };

  return { state: deriveState(plan, request, isPast), refresh, announcement };
}

type Outcome = { ok: true } | { ok: false; message: string; retryAt?: number } | "aborted";

/** Fetches ideas for the plan's current brief and saves them with its fingerprint. */
async function loadIdeas(plan: SavedPlan, today: IsoDate, signal?: AbortSignal): Promise<Outcome> {
  const fingerprint = briefFingerprint(plan.brief);
  try {
    const result = await requestIdeas(plan.brief, today, signal);
    if (!result.ok) {
      return { ok: false, message: result.message, retryAt: retryAtFrom(result.retryAfterSeconds) };
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
    if (error instanceof DOMException && error.name === "AbortError") return "aborted";
    throw error;
  }
}

function deriveState(plan: SavedPlan, request: Request, isPast: boolean): IdeasState {
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
