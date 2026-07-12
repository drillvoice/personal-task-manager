"use client";

import { useState, useTransition } from "react";
import { Check, Flag, Plus } from "lucide-react";
import { PriorityBadge } from "@/components/priority-badge";
import {
  finishReview,
  quickAddTask,
  toggleWeeklyPriority,
  updateProjectNotes,
  updateReflection,
  updateReviewFlag,
} from "@/app/(app)/review/actions";
import type { ReviewData } from "@/lib/server/review";
import { shortDateLabel } from "@/lib/time";

const WEEKLY_CAP = 3;

export function ReviewView({ data }: { data: ReviewData }) {
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
            className="font-mono text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
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
          <span style={{ color: "var(--color-ink-soft)" }}>
            {" "}
            ({selectedCount}/{WEEKLY_CAP} selected)
          </span>
        }
      />
      {priorityError && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {priorityError}
        </p>
      )}
      <div
        className="mb-6 rounded-[4px] border p-1"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
        }}
      >
        {data.actionableTasks.length === 0 && (
          <p
            className="p-3 text-[13px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            No open tasks to pick from.
          </p>
        )}
        {data.actionableTasks.map((t) => {
          const on = selected.has(t.id);
          const disabled = !on && selectedCount >= WEEKLY_CAP;
          return (
            <label
              key={t.id}
              className="flex items-center gap-3 border-b px-2 py-2.5 text-[14px]"
              style={{
                borderColor: "var(--color-line)",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => !disabled && togglePriority(t.id)}
                disabled={pending || disabled}
                aria-pressed={on}
                className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
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
              <Flag size={12} style={{ color: "var(--color-ink-soft)" }} />
              <PriorityBadge priority={t.priority} />
              <span className="flex-1">{t.title}</span>
              {t.projectName && (
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--color-ink-soft)" }}
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

      <FinishButton completed={!!data.review.completedAt} />
    </div>
  );
}

function StreakHeader({ data }: { data: ReviewData }) {
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
        className="font-mono mb-6 text-[11px]"
        style={{ color: "var(--color-ink-soft)" }}
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
      className="font-mono mb-2 text-[11px] font-semibold"
      style={{ color: "var(--color-accent)" }}
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
      className="mb-6 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <FlagLabel
        checked={inbox}
        onChange={() => toggleFlag("inboxCleared", inbox, setInbox)}
        label="Inbox processed to zero"
      />
      <div
        className="border-t"
        style={{ borderColor: "var(--color-line)" }}
      />
      <FlagLabel
        checked={loops}
        onChange={() => toggleFlag("loopsCaptured", loops, setLoops)}
        label="Loose open loops captured"
      />
      <div
        className="border-t"
        style={{ borderColor: "var(--color-line)" }}
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
        className="border-t"
        style={{ borderColor: "var(--color-line)" }}
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
        className="mt-3 flex items-center gap-2 border-t pt-3"
        style={{ borderColor: "var(--color-line)" }}
      >
        <Plus size={14} style={{ color: "var(--color-ink-soft)" }} />
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
          placeholder="Quick capture something you just remembered… (#tag adds a tag)"
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: "var(--color-ink)" }}
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
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
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
      className="rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <h3 className="font-display mb-2 text-[15px] font-semibold">{name}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
        <div>
          {previousNotes && (
            <div className="mb-2">
              <p
                className="font-mono mb-1 text-[10px] tracking-wide uppercase"
                style={{ color: "var(--color-ink-soft)" }}
              >
                From {previousWeekLabel}
              </p>
              <p
                className="rounded-[4px] border border-dashed p-2 text-[13px] leading-relaxed whitespace-pre-wrap"
                style={{
                  borderColor: "var(--color-line)",
                  color: "var(--color-ink-soft)",
                }}
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
            className="w-full resize-y border bg-transparent p-3 text-[13px] leading-relaxed outline-none"
            style={{
              borderColor: "var(--color-line)",
              color: "var(--color-ink)",
            }}
          />
        </div>
        <div>
          {tasks.length === 0 && (
            <p
              className="py-1 text-[12px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              No open tasks.
            </p>
          )}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 border-b px-1 py-2 text-[13px]"
              style={{ borderColor: "var(--color-line)" }}
            >
              <PriorityBadge priority={t.priority} />
              <span className="flex-1">{t.title}</span>
              <button
                type="button"
                onClick={() => togglePriority(t.id)}
                disabled={pending}
                className="font-mono text-[11px]"
                style={{
                  color: weeklyOn.has(t.id)
                    ? "var(--color-accent)"
                    : "var(--color-ink-soft)",
                }}
              >
                {weeklyOn.has(t.id) ? "★ priority" : "☆ pick"}
              </button>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 pt-2">
            <Plus size={14} style={{ color: "var(--color-ink-soft)" }} />
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
              placeholder="Add a next action… (#tag adds a tag)"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Reflection({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      await updateReflection(value);
    });
  return (
    <div
      className="mb-6 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={pending}
        rows={3}
        placeholder="How did this week actually go?"
        className="w-full bg-transparent text-[13px] outline-none"
        style={{ color: "var(--color-ink)" }}
      />
    </div>
  );
}

function FinishButton({ completed }: { completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const submit = () => startTransition(async () => await finishReview());
  return (
    <button
      type="button"
      onClick={submit}
      disabled={pending || completed}
      className="font-mono w-full rounded-full px-5 py-3 text-[13px] font-semibold"
      style={{
        background: completed ? "var(--color-teal)" : "var(--color-ink)",
        color: "var(--color-paper)",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {completed ? "Review completed ✓" : "Finish review"}
    </button>
  );
}
