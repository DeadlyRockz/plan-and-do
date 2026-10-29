import type { Icon } from "@phosphor-icons/react";
import { CakeIcon, HeartIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import type { EventBrief } from "@/domain/brief";
import { SUBTYPE_LABELS, type EventType } from "@/domain/event-types";

export const EVENT_TYPE_ICONS: Record<EventType, Icon> = {
  wedding: HeartIcon,
  birthday: CakeIcon,
  community: UsersThreeIcon,
};

export const EVENT_TYPE_DESCRIPTIONS: Record<EventType, string> = {
  wedding: "Ceremony, reception or both",
  birthday: "From a child's party to a milestone",
  community: "Fundraisers, festivals, meetups and drives",
};

/** The plan's display name: the user's own, or one built from the event type. */
export function eventTitle(brief: EventBrief): string {
  if (brief.eventName) return brief.eventName;
  const subtype = SUBTYPE_LABELS[brief.subtype];
  return brief.eventType === "wedding" ? `${subtype} wedding` : subtype;
}
