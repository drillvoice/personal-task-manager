"use client";

import { TaskRow, type TaskRowProps } from "@/components/task-row";
import { useTaskEditor } from "@/components/task-editor-overlay";

export function AlsoDueList({ tasks }: { tasks: TaskRowProps["task"][] }) {
  const { openEditor } = useTaskEditor();
  return (
    <div
      className="rounded-[4px] border p-1 [&>*:last-child]:border-b-0"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          showProject
          onSelect={() => openEditor(t.id)}
        />
      ))}
    </div>
  );
}
