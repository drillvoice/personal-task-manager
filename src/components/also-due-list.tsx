"use client";

import { TaskRow, type TaskRowProps } from "@/components/task-row";
import { useTaskEditor } from "@/components/task-editor-overlay";
import { usePlanDnd } from "@/components/today-plan-dnd";

export function AlsoDueList({
  tasks,
  draggable = false,
}: {
  tasks: TaskRowProps["task"][];
  draggable?: boolean;
}) {
  const { openEditor } = useTaskEditor();
  const dnd = usePlanDnd();
  const canDrag = draggable && dnd !== null;

  const visible = canDrag
    ? tasks.filter((t) => !dnd!.hiddenIds.has(t.id))
    : tasks;

  if (canDrag && visible.length === 0) return null;

  return (
    <div
      className="card p-1 [&>*:last-child]:border-b-0"
    >
      {visible.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          showProject
          onSelect={() => openEditor(t.id)}
          draggable={canDrag}
          onTaskDragStart={
            canDrag
              ? (e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", t.id);
                  dnd!.setDraggingTask(t);
                }
              : undefined
          }
          onTaskDragEnd={canDrag ? () => dnd!.setDraggingTask(null) : undefined}
        />
      ))}
    </div>
  );
}
