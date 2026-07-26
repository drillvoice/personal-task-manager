"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TaskRowProps } from "@/components/task-row";

type DraggingTask = TaskRowProps["task"];

type PlanDndValue = {
  draggingTask: DraggingTask | null;
  setDraggingTask: (task: DraggingTask | null) => void;
  // Ids optimistically pulled out of "Also due today" once dropped into a
  // plan slot, so the row doesn't linger in both places until revalidation.
  hiddenIds: ReadonlySet<string>;
  hide: (id: string) => void;
  unhide: (id: string) => void;
};

const PlanDndContext = createContext<PlanDndValue | null>(null);

export function PlanDndProvider({ children }: { children: ReactNode }) {
  const [draggingTask, setDraggingTask] = useState<DraggingTask | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const hide = (id: string) =>
    setHiddenIds((prev) => new Set(prev).add(id));
  const unhide = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  return (
    <PlanDndContext.Provider
      value={{ draggingTask, setDraggingTask, hiddenIds, hide, unhide }}
    >
      {children}
    </PlanDndContext.Provider>
  );
}

export function usePlanDnd(): PlanDndValue | null {
  return useContext(PlanDndContext);
}
