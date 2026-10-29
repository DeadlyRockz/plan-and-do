"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { planStore } from "@/lib/plan-store";
import type { SavedPlan } from "@/lib/storage";

/** How long the "Plan deleted" toast offers Undo. */
export const UNDO_WINDOW_MS = 5000;

/**
 * Deletes a plan from this browser and offers Undo for a few seconds (plan/08 §8.1). Undo puts
 * the exact plan back, then runs `onUndo`, for example to return to its page.
 */
export function deletePlanWithUndo(plan: SavedPlan, onUndo?: () => void): void {
  planStore.remove(plan.id);
  toast("Plan deleted", {
    duration: UNDO_WINDOW_MS,
    action: {
      label: "Undo",
      onClick: () => {
        planStore.save(plan);
        onUndo?.();
      },
    },
  });
}

/** The confirmation step before a plan is deleted. `children` is the button that opens it. */
export function DeletePlanDialog({
  planTitle,
  onConfirm,
  children,
}: {
  planTitle: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {planTitle}?</AlertDialogTitle>
        <AlertDialogDescription>
          It will be removed from this browser. You can undo for a few seconds afterwards.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete plan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
