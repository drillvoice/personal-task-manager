"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Search, Users } from "lucide-react";
import { createMeeting } from "@/app/(app)/meetings/actions";
import { createPerson } from "@/app/(app)/people/actions";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import { TagChip } from "@/components/tag-chip";
import { DueLabel } from "@/components/due-label";
import type { MeetingListItem } from "@/lib/server/meetings";
import type { ContactOption } from "@/lib/server/people";
import { todayIso } from "@/lib/time";

function matchesFilters(
  m: MeetingListItem,
  search: string,
  tagFilter: Set<string>,
): boolean {
  if (tagFilter.size > 0 && !m.tags.some((t) => tagFilter.has(t.name))) {
    return false;
  }
  const q = search.trim().toLowerCase();
  if (q === "") return true;
  return (
    m.title.toLowerCase().includes(q) ||
    m.attendees.some((a) => a.name.toLowerCase().includes(q)) ||
    m.tags.some((t) => t.name.toLowerCase().includes(q))
  );
}

function MeetingRow({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="flex flex-wrap items-center gap-2 border-b px-1 py-2.5"
      style={{ borderColor: "var(--color-line)" }}
    >
      <span
        className="min-w-[120px] flex-1 text-[14px]"
        style={{ color: "var(--color-ink)" }}
      >
        {meeting.title}
      </span>
      {meeting.attendees.length > 0 && (
        <span
          className="font-mono flex items-center gap-1 text-[10px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <Users size={10} />
          {meeting.attendees.map((a) => a.name).join(", ")}
        </span>
      )}
      {meeting.tags.map((t) => (
        <TagChip key={t.id} color={t.color}>
          {t.name}
        </TagChip>
      ))}
      {meeting.taskCount > 0 && (
        <span
          className="font-mono text-[10px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {meeting.taskCount} task{meeting.taskCount === 1 ? "" : "s"}
        </span>
      )}
      {meeting.status === "upcoming" ? (
        <DueLabel dateIso={meeting.meetingDate} />
      ) : (
        <span
          className="font-mono flex items-center gap-1 text-[11px] font-medium"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <CalendarDays size={11} strokeWidth={2} />
          {meeting.meetingDate}
        </span>
      )}
    </Link>
  );
}

function NewMeetingForm({
  people,
  onCancel,
}: {
  people: ContactOption[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => todayIso());
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const createPersonOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createPerson({ name });
    return res.ok ? { id: res.id, name } : null;
  };

  const submit = () => {
    if (!title.trim() || !meetingDate) return;
    startTransition(async () => {
      const res = await createMeeting({ title, meetingDate, attendeeIds });
      if (res.ok) {
        router.push(`/meetings/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  };

  const formKeyHandler = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="mb-4 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
      onKeyDown={formKeyHandler}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Meeting title…"
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div className="min-w-0">
          <EntityPicker
            mode="multi"
            options={people}
            selectedIds={attendeeIds}
            onChange={setAttendeeIds}
            onCreate={createPersonOption}
            placeholder="Add attendee…"
            icon={Users}
          />
        </div>
        <input
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          className="w-full border p-2 text-[13px] outline-none sm:w-[160px]"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
      </div>
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !title.trim() || !meetingDate}
          className="font-mono px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: pending || !title.trim() || !meetingDate ? 0.6 : 1,
          }}
        >
          Create meeting
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono px-3 py-1.5 text-[12px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function MeetingsView({
  meetings,
  people,
}: {
  meetings: MeetingListItem[];
  people: ContactOption[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());

  const upcoming = meetings.filter((m) => m.status === "upcoming");
  const archived = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "completed")
        .filter((m) => matchesFilters(m, search, tagFilter))
        .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    [meetings, search, tagFilter],
  );

  const archiveTags = [
    ...new Set(
      meetings
        .filter((m) => m.status === "completed")
        .flatMap((m) => m.tags.map((t) => t.name)),
    ),
  ].sort();

  const toggleTag = (name: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const filtering = search.trim() !== "" || tagFilter.size > 0;

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Meetings</h1>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-paper-raised)",
          }}
        >
          <Plus size={12} /> New meeting
        </button>
      </div>

      {showAdd && (
        <NewMeetingForm people={people} onCancel={() => setShowAdd(false)} />
      )}

      <h2
        className="font-mono mb-1 text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Upcoming
      </h2>
      {upcoming.length === 0 ? (
        <p
          className="font-mono mb-6 rounded-[4px] border border-dashed px-3 py-4 text-center text-[12px]"
          style={{
            borderColor: "var(--color-line)",
            color: "var(--color-ink-soft)",
          }}
        >
          No upcoming meetings.
        </p>
      ) : (
        <div className="mb-6">
          {upcoming.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
        </div>
      )}

      <h2
        className="font-mono mb-2 text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Archive
      </h2>
      <div
        className="mb-2 flex items-center gap-2 rounded-[4px] border px-3 py-2"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
        }}
      >
        <Search size={14} style={{ color: "var(--color-ink-soft)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, attendee, or tag…"
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: "var(--color-ink)" }}
        />
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTagFilter(new Set());
            }}
            className="font-mono text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Clear
          </button>
        )}
      </div>
      {archiveTags.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {archiveTags.map((tag) => {
            const on = tagFilter.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="font-mono rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{
                  borderColor: on ? "var(--color-teal)" : "var(--color-line)",
                  background: on ? "var(--color-teal)" : "transparent",
                  color: on ? "var(--color-paper)" : "var(--color-ink-soft)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      {archived.length === 0 ? (
        <p
          className="font-mono rounded-[4px] border border-dashed px-3 py-4 text-center text-[12px]"
          style={{
            borderColor: "var(--color-line)",
            color: "var(--color-ink-soft)",
          }}
        >
          {filtering ? "No meetings match." : "No completed meetings yet."}
        </p>
      ) : (
        <div>
          {archived.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  );
}
