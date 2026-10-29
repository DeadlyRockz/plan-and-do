import { describe, expect, it } from "vitest";
import { EventBriefSchema } from "@/domain/brief";
import {
  MAX_SAVED_PLANS,
  PlanRepository,
  STORAGE_KEY,
  type KeyValueStore,
  type SavedPlan,
} from "../storage";

class MemoryStore implements KeyValueStore {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new DOMException("denied", "SecurityError");
  }
  setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}

/** Reads work but every write hits a full quota. */
class FullStore extends MemoryStore {
  override setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}

function plan(id: string, updatedAt = "2026-10-29T10:00:00.000Z"): SavedPlan {
  return {
    schemaVersion: 1,
    id,
    createdAt: updatedAt,
    updatedAt,
    plannedOn: "2026-10-29",
    brief: EventBriefSchema.parse({
      eventType: "birthday",
      subtype: "child",
      eventDate: "2026-11-20",
      guestCount: 12,
      budget: { amount: 15000, currency: "INR" },
    }),
    progress: { milestones: [], vendors: [] },
    chat: [],
  };
}

describe("PlanRepository", () => {
  it("saves_and_reads_back_a_plan", () => {
    const repository = new PlanRepository(() => new MemoryStore());
    const store = new MemoryStore();
    const shared = new PlanRepository(() => store);
    shared.save(plan("a"));
    expect([shared.get("a")?.id, repository.list()]).toEqual(["a", []]);
  });

  it("lists_newest_first", () => {
    const store = new MemoryStore();
    const repository = new PlanRepository(() => store);
    repository.save(plan("old", "2026-10-01T00:00:00.000Z"));
    repository.save(plan("new", "2026-10-28T00:00:00.000Z"));
    expect(repository.list().map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("storage_skips_corrupt_entries_and_reports_once", () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify([plan("good"), { id: "bad" }]));
    const repository = new PlanRepository(() => store);
    const first = [repository.list().map((item) => item.id), repository.takeNotices()];
    repository.list();
    expect([...first, repository.takeNotices()]).toEqual([["good"], ["corrupt-entries"], []]);
  });

  it("survives_storage_that_is_not_json", () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, "{not json");
    const repository = new PlanRepository(() => store);
    expect([repository.list(), repository.takeNotices()]).toEqual([[], ["corrupt-entries"]]);
  });

  it("storage_falls_back_to_memory_when_unavailable", () => {
    const repository = new PlanRepository(() => new BrokenStore());
    repository.save(plan("kept"));
    expect([repository.get("kept")?.id, repository.takeNotices()]).toEqual([
      "kept",
      ["storage-unavailable"],
    ]);
  });

  it("drops_the_oldest_plan_beyond_the_limit_and_says_so", () => {
    const store = new MemoryStore();
    const repository = new PlanRepository(() => store);
    for (let index = 0; index <= MAX_SAVED_PLANS; index += 1) {
      repository.save(plan(`p${index}`, new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()));
    }
    expect([repository.list().length, repository.get("p0"), repository.takeNotices()]).toEqual([
      MAX_SAVED_PLANS,
      undefined,
      ["oldest-dropped"],
    ]);
  });

  it("keeps_a_plan_whose_saved_suggestions_are_invalid", () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify([{ ...plan("a"), chatSuggestions: [42] }]));
    const loaded = new PlanRepository(() => store).get("a");
    expect([loaded?.id, loaded?.chatSuggestions]).toEqual(["a", undefined]);
  });

  it("flags_stored_json_that_is_not_a_list", () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ plans: [plan("a")] }));
    const repository = new PlanRepository(() => store);
    expect([repository.list(), repository.takeNotices()]).toEqual([[], ["corrupt-entries"]]);
  });

  it("keeps_plans_in_memory_when_writes_fail_and_says_so_once", () => {
    const repository = new PlanRepository(() => new FullStore());
    repository.save(plan("first", "2026-10-01T00:00:00.000Z"));
    const notices = repository.takeNotices();
    repository.save(plan("second", "2026-10-02T00:00:00.000Z"));
    expect([repository.list().map((item) => item.id), notices, repository.takeNotices()]).toEqual([
      ["second", "first"],
      ["storage-unavailable"],
      [],
    ]);
  });

  it("keeps_nothing_and_raises_no_notice_without_a_backend", () => {
    const repository = new PlanRepository(() => undefined);
    repository.save(plan("a"));
    expect([repository.raw(), repository.list(), repository.takeNotices()]).toEqual([null, [], []]);
  });

  it("removes_a_plan", () => {
    const store = new MemoryStore();
    const repository = new PlanRepository(() => store);
    repository.save(plan("a"));
    repository.remove("a");
    expect(repository.list()).toEqual([]);
  });
});
