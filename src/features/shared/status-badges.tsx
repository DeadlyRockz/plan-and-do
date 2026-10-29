import {
  CheckCircleIcon,
  HourglassIcon,
  InfoIcon,
  LightningIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { PlanMode } from "@/domain/context";
import type { WarningSeverity } from "@/domain/warnings";
import { Badge } from "@/components/ui/badge";

type Status = { label: string; icon: Icon; variant: "primary" | "warning" | "destructive" };

/** Status always pairs an icon with text, never colour alone (rule 9.4). */
export const SEVERITY_STATUS: Record<WarningSeverity, Status> = {
  critical: { label: "Critical", icon: WarningOctagonIcon, variant: "destructive" },
  warning: { label: "Warning", icon: WarningIcon, variant: "warning" },
  info: { label: "Note", icon: InfoIcon, variant: "primary" },
};

export const MODE_STATUS: Record<PlanMode, Status> = {
  "on-track": { label: "On track", icon: CheckCircleIcon, variant: "primary" },
  compressed: { label: "Compressed", icon: HourglassIcon, variant: "warning" },
  urgent: { label: "Urgent", icon: LightningIcon, variant: "destructive" },
};

export function StatusBadge({ status }: { status: Status }) {
  const StatusIcon = status.icon;
  return (
    <Badge variant={status.variant}>
      <StatusIcon size={14} weight="bold" aria-hidden="true" />
      {status.label}
    </Badge>
  );
}
