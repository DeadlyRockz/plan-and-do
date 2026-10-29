import type { EventBrief } from "./brief";
import { needsCoordinator, type PlanMode } from "./context";
import { addDays, type IsoDate } from "./dates";
import {
  CONTEXT_MILESTONES,
  TIMELINE_TEMPLATES,
  type MilestoneTemplate,
} from "./reference/milestones";

export type Milestone = {
  id: string;
  title: string;
  due: IsoDate;
  /** Days before the event after scheduling; negative for follow-ups after the event. */
  daysBefore: number;
  critical: boolean;
  /** Its usual slot had already passed, so it was squeezed into the time that is left. */
  compressed: boolean;
  /** Urgent mode only: a non-critical step listed under "If time allows". */
  optional: boolean;
  isPostEvent: boolean;
};

/**
 * Works the milestones back from the event date (plan/05 §5.4). With enough lead time each
 * milestone keeps its ideal offset. Otherwise the ones that no longer fit are spread evenly
 * between today and the first milestone that still fits; everything later stays put.
 */
export function scheduleMilestones(
  brief: EventBrief,
  leadTimeDays: number,
  mode: PlanMode,
): Milestone[] {
  const templates = milestoneTemplatesFor(brief);
  const offsets = scheduledOffsets(
    templates.map((template) => template.offset),
    leadTimeDays,
    mode,
  );
  return templates.map((template, index) => {
    const daysBefore = offsets[index] ?? template.offset;
    const isPostEvent = template.offset < 0;
    return {
      id: template.id,
      title: template.title,
      due: addDays(brief.eventDate, -daysBefore),
      daysBefore,
      critical: template.critical,
      compressed: daysBefore !== template.offset,
      optional: mode === "urgent" && !template.critical && !isPostEvent,
      isPostEvent,
    };
  });
}

/** The event type's template plus the context milestones, in offset order (largest first). */
export function milestoneTemplatesFor(brief: EventBrief): MilestoneTemplate[] {
  const extras: MilestoneTemplate[] = [];
  const addContext = (key: keyof typeof CONTEXT_MILESTONES) => {
    const { id, title, critical, offsets } = CONTEXT_MILESTONES[key];
    const offset = offsets[brief.eventType];
    if (offset !== undefined) extras.push({ id, title, critical, offset });
  };
  if (brief.setting === "outdoor") addContext("weather");
  if (brief.accessibilityNeeds.length > 0) addContext("accessibility");
  if (needsCoordinator(brief)) addContext("coordinator");

  // Array.prototype.sort is stable, so a context milestone lands after template ones that share
  // its offset.
  return [...TIMELINE_TEMPLATES[brief.eventType].milestones, ...extras].sort(
    (a, b) => b.offset - a.offset,
  );
}

function scheduledOffsets(offsets: readonly number[], leadTime: number, mode: PlanMode): number[] {
  if (mode === "on-track") return [...offsets];

  const lateIndexes = offsets.flatMap((offset, index) => (offset > leadTime ? [index] : []));
  const anchor = Math.max(...offsets.filter((offset) => offset >= 0 && offset <= leadTime));
  const span = leadTime - anchor;
  const result = [...offsets];
  lateIndexes.forEach((milestoneIndex, position) => {
    result[milestoneIndex] = leadTime - Math.floor((position * span) / lateIndexes.length);
  });
  return result;
}
