"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Flag, Plus } from "lucide-react";
import { PriorityBadge } from "@/components/priority-badge";
import { AutosaveTextarea } from "@/components/autosave-textarea";
import {
  finishReview,
  quickAddTask,
  startNewReview,
  toggleWeeklyPriority,
  updateProjectNotes,
  updateReflection,
  updateReviewFlag,
} from "@/app/(app)/review/actions";
import { setTaskDone } from "@/app/(app)/today/actions";
import type {
  ReviewCompletedData,
  ReviewData,
  ReviewEditingData,
} from "@/lib/server/review";
import { shortDateLabel } from "@/lib/time";
import { WEEKLY_PRIORITY_CAP } from "@/lib/caps";

export function ReviewView({ data }: { data: ReviewData }) {
  if (data.mode === "completed") {
    return <CompletedReview data={data} />;
  }
  return <EditingReview data={data} />;
}

function CompletedReview({ data }: { data: ReviewCompletedData }) {
  const [pending, startTransition] = useTransition();
  const start = () => startTransition(async () => await startNewReview());
  const c = data.completed;

  return (
    <div className="p-4 pb-24">
      <StreakHeader data={data} />

      <div
        className="mb-4 card p-4"
      >
        <p
          className="font-mono mb-1 text-[11px] font-semibold text-teal"
        >
          ✓ Review filed to history
        </p>
        <p
          className="font-mono mb-3 text-[11px] text-ink-soft"
        >
          Completed {shortDateLabel(c.completedAt)} · week of {c.weekLabel}
        </p>
        {c.priorities.length > 0 && (
          <ul className="mb-2">
            {c.priorities.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-2 py-0.5 text-[13px]"
              >
                <span
                  className="font-mono text-[11px]"
                  style={{
                    color: p.done
                      ? "var(--color-teal)"
                      : "var(--color-ink-soft)",
                  }}
                >
                  {p.done ? "✓" : "○"}
                </span>
                <span
                  style={{
                    color: p.done
                      ? "var(--color-ink-soft)"
                      : "var(--color-ink)",
                  }}
                >
                  {p.title}
                </span>
              </li>
            ))}
          </ul>
        )}
        {c.reflectionNotes && (
          <p className="text-[13px] text-ink">
            {c.reflectionNotes}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="font-mono w-full rounded-full px-5 py-3 text-[13px] font-semibold bg-ink text-paper"
        style={{ opacity: pending ? 0.6 : 1 }}
      >
        Start next review
      </button>
      <div className="mt-3 text-center">
        <Link
          href="/review/history"
          className="font-mono text-[11px] text-accent"
        >
          View history →
        </Link>
      </div>
    </div>
  );
}

function EditingReview({ data }: { data: ReviewEditingData }) {
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(data.selectedPriorityIds),
  );
  const [pending, startTransition] = useTransition();

  const selectedCount = selected.size;

  const togglePriority = (taskId: string) => {
    // Optimistic: flip locally first, revert only if the server rejects
    // (e.g. the cap was already full on another device).
    const flip = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    };
    setPriorityError(null);
    setSelected(flip);
    startTransition(async () => {
      const res = await toggleWeeklyPriority(taskId);
      if (!res.ok) {
        setSelected(flip);
        setPriorityError(res.error);
      }
    });
  };

  return (
    <div className="p-4 pb-24">
      <StreakHeader data={data} />

      <SectionHeading n={1} label="GET CLEAR" />
      <GetClear
        inboxCleared={data.review.inboxCleared}
        loopsCaptured={data.review.loopsCaptured}
        lastWeekCalendarReviewed={data.review.lastWeekCalendarReviewed}
        thisWeekCalendarReviewed={data.review.thisWeekCalendarReviewed}
      />

      <SectionHeading n={2} label="REVIEW PROJECTS" />
      <div className="mb-6 space-y-3">
        {data.activeProjects.length === 0 && (
          <p
            className="font-mono text-[11px] text-ink-soft"
          >
            No active projects. Add one from the Projects tab.
          </p>
        )}
        {data.activeProjects.map((p) => (
          <ReviewProjectCard
            key={p.id}
            projectId={p.id}
            name={p.name}
            defaultNotes={p.notes}
            previousNotes={p.previousNotes}
            previousWeekLabel={p.previousWeekLabel}
            tasks={p.tasks}
            weeklyOn={selected}
            togglePriority={togglePriority}
          />
        ))}
      </div>

      <SectionHeading
        n={3}
        label="SET WEEKLY PRIORITIES"
        extra={
          <span className="text-ink-soft">
            {" "}
            ({selectedCount}/{WEEKLY_PRIORITY_CAP} selected)
          </span>
        }
      />
      {priorityError && (
        <p
          className="font-mono mb-2 text-[11px] text-danger"
        >
          {priorityError}
        </p>
      )}
      <div
        className="mb-6 card p-1"
      >
        {data.actionableTasks.length === 0 && (
          <p
            className="p-3 text-[13px] text-ink-soft"
          >
            No open tasks to pick from.
          </p>
        )}
        {data.actionableTasks.map((t) => {
          const on = selected.has(t.id);
          const disabled = !on && selectedCount >= WEEKLY_PRIORITY_CAP;
          return (
            <label
              key={t.id}
              className="flex items-center gap-3 border-b px-2 py-2.5 text-[14px] border-line"
              style={{ opacity: disabled ? 0.4 : 1 }}
            >
              <button
                type="button"
                onClick={() => !disabled && togglePriority(t.id)}
                disabled={pending || disabled}
                aria-pressed={on}
                className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-card border-[1.5px]"
                style={{
                  background: on ? "var(--color-teal)" : "transparent",
                  borderColor: on
                    ? "var(--color-teal)"
                    : "var(--color-ink-soft)",
                }}
              >
                {on && (
                  <Check size={12} color="var(--color-paper-raised)" strokeWidth={3} />
                )}
              </button>
              <Flag className="text-ink-soft" size={12} />
              <PriorityBadge priority={t.priority} />
              <span className="flex-1">{t.title}</span>
              {t.projectName && (
                <span
                  className="font-mono text-[11px] text-ink-soft"
                >
                  {t.projectName}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <SectionHeading n={4} label="REFLECTION" />
      <Reflection defaultValue={data.review.reflectionNotes} />

      <FinishButton />
    </div>
  );
}

function StreakHeader({
  data,
}: {
  data: Pick<ReviewData, "streak" | "lastCompletedAt" | "completedThisWeek">;
}) {
  const line = [
    data.streak > 0 ? `${data.streak}-week streak` : null,
    data.lastCompletedAt
      ? `last completed ${shortDateLabel(data.lastCompletedAt)}`
      : null,
    data.completedThisWeek > 0
      ? `${data.completedThisWeek} task${data.completedThisWeek === 1 ? "" : "s"} done this week`
      : null,
  ]
    .filter(Boolean)
    .join(" · ") || "First review";

  return (
    <>
      <h1 className="font-display mb-1 text-xl font-bold">Weekly review</h1>
      <p
        className="font-mono mb-6 text-[11px] text-ink-soft"
      >
        {line}
      </p>
    </>
  );
}

function SectionHeading({
  n,
  label,
  extra,
}: {
  n: number;
  label: string;
  extra?: React.ReactNode;
}) {
  return (
    <h2
      className="font-mono mb-2 text-[11px] font-semibold text-accent"
    >
      {n} · {label}
      {extra}
    </h2>
  );
}

function GetClear({
  inboxCleared,
  loopsCaptured,
  lastWeekCalendarReviewed,
  thisWeekCalendarReviewed,
}: {
  inboxCleared: boolean;
  loopsCaptured: boolean;
  lastWeekCalendarReviewed: boolean;
  thisWeekCalendarReviewed: boolean;
}) {
  const [inbox, setInbox] = useState(inboxCleared);
  const [loops, setLoops] = useState(loopsCaptured);
  const [lastWeekCalendar, setLastWeekCalendar] = useState(
    lastWeekCalendarReviewed,
  );
  const [thisWeekCalendar, setThisWeekCalendar] = useState(
    thisWeekCalendarReviewed,
  );
  const [capture, setCapture] = useState("");
  const [pending, startTransition] = useTransition();

  const toggleFlag = (
    field:
      | "inboxCleared"
      | "loopsCaptured"
      | "lastWeekCalendarReviewed"
      | "thisWeekCalendarReviewed",
    current: boolean,
    setter: (v: boolean) => void,
  ) => {
    setter(!current);
    startTransition(async () => {
      await updateReviewFlag(field, !current);
    });
  };

  const submitCapture = () => {
    const title = capture.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await quickAddTask({ title, projectId: null });
      if (res.ok) setCapture("");
    });
  };

  return (
    <div
      className="mb-6 card p-4"
    >
      <FlagLabel
        checked={inbox}
        onChange={() => toggleFlag("inboxCleared", inbox, setInbox)}
        label="Inbox processed to zero"
      />
      <div
        className="border-t border-line"
      />
      <FlagLabel
        checked={loops}
        onChange={() => toggleFlag("loopsCaptured", loops, setLoops)}
        label="Loose open loops captured"
      />
      <div
        className="border-t border-line"
      />
      <FlagLabel
        checked={lastWeekCalendar}
        onChange={() =>
          toggleFlag(
            "lastWeekCalendarReviewed",
            lastWeekCalendar,
            setLastWeekCalendar,
          )
        }
        label="Review last week's calendar"
      />
      <div
        className="border-t border-line"
      />
      <FlagLabel
        checked={thisWeekCalendar}
        onChange={() =>
          toggleFlag(
            "thisWeekCalendarReviewed",
            thisWeekCalendar,
            setThisWeekCalendar,
          )
        }
        label="Review this week's calendar"
      />
      <div
        className="mt-3 flex items-center gap-2 border-t pt-3 border-line"
      >
        <Plus className="text-ink-soft" size={14} />
        <input
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCapture();
            }
          }}
          disabled={pending}
          placeholder="Quick capture something you just remembered… (#tag, or a due date like 'in 3 days')"
          className="flex-1 bg-transparent text-[13px] outline-none text-ink"
        />
      </div>
    </div>
  );
}

function FlagLabel({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 py-2 text-[14px]">
      <button
        type="button"
        onClick={onChange}
        aria-pressed={checked}
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-card border-[1.5px]"
        style={{
          background: checked ? "var(--color-teal)" : "transparent",
          borderColor: checked ? "var(--color-teal)" : "var(--color-ink-soft)",
        }}
      >
        {checked && (
          <Check size={12} color="var(--color-paper-raised)" strokeWidth={3} />
        )}
      </button>
      <span>{label}</span>
    </label>
  );
}

function ReviewProjectCard({
  projectId,
  name,
  defaultNotes,
  previousNotes,
  previousWeekLabel,
  tasks,
  weeklyOn,
  togglePriority,
}: {
  projectId: string;
  name: string;
  defaultNotes: string;
  previousNotes: string | null;
  previousWeekLabel: string | null;
  tasks: {
    id: string;
    title: string;
    priority: 1 | 2 | 3 | null;
  }[];
  weeklyOn: Set<string>;
  togglePriority: (id: string) => void;
}) {
  const [notes, setNotes] = useState(defaultNotes);
  const [action, setAction] = useState("");
  const [pending, startTransition] = useTransition();

  const saveNotes = () => {
    startTransition(async () => {
      await updateProjectNotes(projectId, notes);
    });
  };

  const submitAction = () => {
    const title = action.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await quickAddTask({ title, projectId });
      if (res.ok) setAction("");
    });
  };

  return (
    <div
      className="card p-4"
    >
      <h3 className="font-display mb-2 text-[15px] font-semibold">{name}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
        <div>
          {previousNotes && (
            <div className="mb-2">
              <p
                className="font-mono mb-1 text-[10px] tracking-wide uppercase text-ink-soft"
              >
                From {previousWeekLabel}
              </p>
              <p
                className="rounded-card border border-dashed p-2 text-[13px] leading-relaxed whitespace-pre-wrap border-line text-ink-soft"
              >
                {previousNotes}
              </p>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={6}
            placeholder="Any update? What's the state of this project?"
            className="w-full resize-y border bg-transparent p-3 text-[13px] leading-relaxed outline-none border-line text-ink"
          />
        </div>
        <div>
          {tasks.length === 0 && (
            <p
              className="py-1 text-[12px] text-ink-soft"
            >
              No open tasks.
            </p>
          )}
          {tasks.map((t) => (
            <ReviewProjectTaskRow
              key={t.id}
              task={t}
              weeklyOn={weeklyOn.has(t.id)}
              togglePriority={togglePriority}
            />
          ))}
          <div className="mt-2 flex items-center gap-2 pt-2">
            <Plus className="text-ink-soft" size={14} />
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAction();
                }
              }}
              disabled={pending}
              placeholder="Add a next action… (#tag, or a due date like 'in 3 days')"
              className="flex-1 bg-transparent text-[13px] outline-none text-ink"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewProjectTaskRow({
  task,
  weeklyOn,
  togglePriority,
}: {
  task: { id: string; title: string; priority: 1 | 2 | 3 | null };
  weeklyOn: boolean;
  togglePriority: (id: string) => void;
}) {
  // The task list is loaded server-side as open tasks only, so a completed row
  // stays visible (struck through) until the next render drops it.
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const complete = () => {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      const res = await setTaskDone(task.id, next);
      if (!res.ok) setDone(!next);
    });
  };

  return (
    <div
      className="flex items-center gap-2 border-b px-1 py-2 text-[13px] border-line"
    >
      <PriorityBadge priority={task.priority} />
      <span
        className="flex-1"
        style={{
          textDecoration: done ? "line-through" : undefined,
          color: done ? "var(--color-ink-soft)" : undefined,
        }}
      >
        {task.title}
      </span>
      <div className="flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={complete}
          disabled={pending}
          aria-pressed={done}
          className="font-mono text-[11px]"
          style={{
            color: done ? "var(--color-teal)" : "var(--color-ink-soft)",
          }}
        >
          {done ? "✓ done" : "✓ tick"}
        </button>
        <button
          type="button"
          onClick={() => togglePriority(task.id)}
          disabled={pending}
          className="font-mono text-[11px]"
          style={{
            color: weeklyOn ? "var(--color-accent)" : "var(--color-ink-soft)",
          }}
        >
          {weeklyOn ? "★ priority" : "☆ pick"}
        </button>
      </div>
    </div>
  );
}

function Reflection({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="mb-6">
      <AutosaveTextarea
        initialValue={defaultValue}
        onSave={updateReflection}
        placeholder="How did this week actually go?"
        rows={3}
      />
    </div>
  );
}

function FinishButton() {
  const [pending, startTransition] = useTransition();
  const submit = () => startTransition(async () => await finishReview());
  return (
    <button
      type="button"
      onClick={submit}
      disabled={pending}
      className="font-mono w-full rounded-full px-5 py-3 text-[13px] font-semibold bg-ink text-paper"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      Finish review
    </button>
  );
}
