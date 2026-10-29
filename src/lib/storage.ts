import { z } from "zod";
import { EventBriefSchema } from "@/domain/brief";
import { ChatTurnSchema, PlanIdeasSchema, SuggestionsSchema } from "@/domain/contracts";
import { isIsoDate } from "@/domain/dates";

// "occasio" was the working name. The key stays as it is so plans saved before the rename load.
export const STORAGE_KEY = "occasio:plans:v1";
export const MAX_SAVED_PLANS = 50;
export const MAX_CHAT_TURNS = 20;

/**
 * What the browser keeps per plan (plan/07 §7.5). The brief is the single source of truth; the
 * plan itself is rebuilt from it on every load. `plannedOn` anchors the schedule so due dates
 * stay put between visits (docs/adr/0002).
 */
export const SavedPlanSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(64),
  createdAt: z.string(),
  updatedAt: z.string(),
  plannedOn: z.string().refine(isIsoDate),
  brief: EventBriefSchema,
  ideas: z
    .object({
      value: PlanIdeasSchema,
      briefHash: z.string(),
      promptVersion: z.string(),
      adapter: z.enum(["claude", "mock"]),
    })
    .optional(),
  progress: z.object({ milestones: z.array(z.string()), vendors: z.array(z.string()) }),
  chat: z.array(ChatTurnSchema).max(MAX_CHAT_TURNS),
  /** Follow-ups offered after the latest reply. Invalid ones are dropped, never the plan. */
  chatSuggestions: SuggestionsSchema.optional().catch(undefined),
});
export type SavedPlan = z.infer<typeof SavedPlanSchema>;

export type StorageNotice = "corrupt-entries" | "storage-unavailable" | "oldest-dropped";

export type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

/**
 * Plans in localStorage, behind a small repository (plan/04 §4.5). Every entry is validated on
 * load and corrupt ones are skipped, never crashing the app. If storage throws (private mode, a
 * full quota) it switches to memory for the rest of the session and says so once.
 */
export class PlanRepository {
  private memory: string | null = null;
  private usingMemory = false;
  private pending = new Set<StorageNotice>();
  private reportedCorrupt = false;

  constructor(private readonly backend: () => KeyValueStore | undefined) {}

  /** The raw stored string, used to tell cheaply whether anything changed. */
  raw(): string | null {
    if (this.usingMemory) return this.memory;
    try {
      return this.backend()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      this.fallBackToMemory();
      return this.memory;
    }
  }

  list(): SavedPlan[] {
    const raw = this.raw();
    if (!raw) return [];
    let entries: unknown;
    try {
      entries = JSON.parse(raw);
    } catch {
      this.flagCorrupt();
      return [];
    }
    if (!Array.isArray(entries)) {
      this.flagCorrupt();
      return [];
    }
    const plans = entries.flatMap((entry) => {
      const parsed = SavedPlanSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
    if (plans.length !== entries.length) this.flagCorrupt();
    return plans;
  }

  get(id: string): SavedPlan | undefined {
    return this.list().find((plan) => plan.id === id);
  }

  /** Inserts or replaces a plan, newest first, keeping at most 50. */
  save(plan: SavedPlan): void {
    const others = this.list().filter((existing) => existing.id !== plan.id);
    const plans = [plan, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (plans.length > MAX_SAVED_PLANS) this.pending.add("oldest-dropped");
    this.write(plans.slice(0, MAX_SAVED_PLANS));
  }

  remove(id: string): void {
    this.write(this.list().filter((plan) => plan.id !== id));
  }

  /** Notices raised since the last call, each reported once. */
  takeNotices(): StorageNotice[] {
    const notices = [...this.pending];
    this.pending.clear();
    return notices;
  }

  private write(plans: SavedPlan[]): void {
    const value = JSON.stringify(plans);
    if (!this.usingMemory) {
      try {
        const store = this.backend();
        if (store) {
          store.setItem(STORAGE_KEY, value);
          return;
        }
      } catch {
        this.fallBackToMemory();
      }
    }
    this.memory = value;
  }

  /** Callers run this only while still on the real store, so the notice is raised once. */
  private fallBackToMemory(): void {
    this.usingMemory = true;
    this.pending.add("storage-unavailable");
  }

  private flagCorrupt(): void {
    if (this.reportedCorrupt) return;
    this.reportedCorrupt = true;
    this.pending.add("corrupt-entries");
  }
}
