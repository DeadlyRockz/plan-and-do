"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { planStore } from "@/lib/plan-store";
import type { StorageNotice } from "@/lib/storage";

const MESSAGES: Record<StorageNotice, string> = {
  "corrupt-entries": "Some saved data couldn't be read, so it was skipped.",
  "storage-unavailable":
    "Your browser isn't letting us save, so this plan lasts only until you close the tab.",
  "oldest-dropped": "Your oldest plan was removed to make room. You can keep up to 50.",
};

/** Shows any storage notices raised since the last call, each once (plan/07 §7.5). */
export function announceStorageNotices(): void {
  for (const notice of planStore.takeNotices()) toast.warning(MESSAGES[notice]);
}

export function useStorageNotices(ready: boolean): void {
  useEffect(() => {
    if (ready) announceStorageNotices();
  }, [ready]);
}
