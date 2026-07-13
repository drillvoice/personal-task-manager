"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { loadTaskEditData, type TaskEditData } from "@/app/(app)/today/actions";

type TaskEditorContext = { openEditor: (taskId: string) => void };

const Ctx = createContext<TaskEditorContext | null>(null);

export function useTaskEditor(): TaskEditorContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useTaskEditor must be used within a TaskEditorProvider");
  }
  return ctx;
}

// Opens the same editor the Tasks view uses (TaskDetailPanel) as a modal, so
// the Today screen has no room for a persistent side panel.
export function TaskEditorProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TaskEditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const openEditor = useCallback((taskId: string) => {
    setLoading(true);
    startTransition(async () => {
      const res = await loadTaskEditData(taskId);
      setData(res);
      setLoading(false);
    });
  }, []);

  const close = useCallback(() => {
    setData(null);
    setLoading(false);
  }, []);

  const isOpen = loading || data !== null;

  return (
    <Ctx.Provider value={{ openEditor }}>
      {children}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit task"
          onClick={close}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          style={{ background: "rgba(0, 0, 0, 0.45)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-[420px]"
          >
            {data ? (
              <TaskDetailPanel
                task={data.task}
                projects={data.projects}
                people={data.people}
                tagOptions={data.tagOptions}
                onClose={close}
              />
            ) : (
              <div
                className="font-mono rounded-[4px] border p-6 text-[12px]"
                style={{
                  background: "var(--color-paper-raised)",
                  borderColor: "var(--color-line)",
                  color: "var(--color-ink-soft)",
                }}
              >
                Loading task…
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
