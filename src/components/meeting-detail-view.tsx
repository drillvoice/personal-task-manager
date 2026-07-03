"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users } from "lucide-react";
import {
  createTag,
  deleteMeeting,
  setMeetingAttendees,
  setMeetingStatus,
  setMeetingTags,
  updateMeeting,
  updateMeetingNotes,
  updateMeetingPrepNotes,
} from "@/app/(app)/meetings/actions";
import { createPerson } from "@/app/(app)/people/actions";
import { AddTaskForm } from "@/components/add-task-form";
import { AutosaveTextarea } from "@/components/autosave-textarea";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import { TaskRow } from "@/components/task-row";
import type { ProjectSelectOption as ProjectOption } from "@/lib/server/projects";
import type { ContactOption } from "@/lib/server/people";
import type { MeetingDetail, TagOption } from "@/lib/server/meetings";
import type { TagOption as TaskTagOption } from "@/lib/server/tasks";

export function MeetingDetailView({
  meeting,
  people,
  projects,
  availableTags,
  taskTagOptions,
}: {
  meeting: MeetingDetail;
  people: ContactOption[];
  projects: ProjectOption[];
  availableTags: TagOption[];
  taskTagOptions: TaskTagOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(meeting.title);
  const [meetingDate, setMeetingDate] = useState(meeting.meetingDate);
  const [status, setStatus] = useState(meeting.status);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    meeting.attendees.map((a) => a.id),
  );
  const [tagIds, setTagIds] = useState<string[]>(meeting.tags.map((t) => t.id));
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  const saveHeader = () => {
    if (!title.trim() || !meetingDate) return;
    if (title === meeting.title && meetingDate === meeting.meetingDate) return;
    startTransition(async () => {
      await updateMeeting({ id: meeting.id, title, meetingDate });
    });
  };

  const changeAttendees = (ids: string[]) => {
    setAttendeeIds(ids);
    startTransition(async () => {
      await setMeetingAttendees({ id: meeting.id, attendeeIds: ids });
    });
  };

  const changeTags = (ids: string[]) => {
    setTagIds(ids);
    startTransition(async () => {
      await setMeetingTags({ id: meeting.id, tagIds: ids });
    });
  };

  const createPersonOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createPerson({ name });
    return res.ok ? { id: res.id, name } : null;
  };

  const createTagOption = async (
    name: string,
  ): Promise<PickerOption | null> => {
    const res = await createTag({ name });
    return res.ok ? { id: res.id, name: res.name, color: res.color } : null;
  };

  const toggleStatus = () => {
    const next = status === "upcoming" ? "completed" : "upcoming";
    setStatus(next);
    startTransition(async () => {
      await setMeetingStatus({ id: meeting.id, status: next });
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await deleteMeeting(meeting.id);
      if (res.ok) router.push("/meetings");
    });
  };

  return (
    <div className="p-4 pb-24">
      <Link
        href="/meetings"
        className="font-mono mb-3 flex items-center gap-1 text-[11px]"
        style={{ color: "var(--color-ink-soft)" }}
      >
        <ArrowLeft size={11} /> Meetings
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveHeader}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="font-display min-w-[200px] flex-1 border-b bg-transparent pb-1 text-xl font-bold outline-none"
          style={{ borderColor: "transparent", color: "var(--color-ink)" }}
          aria-label="Meeting title"
        />
        <input
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          onBlur={saveHeader}
          className="border p-1.5 text-[13px] outline-none"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
          aria-label="Meeting date"
        />
        <button
          type="button"
          onClick={toggleStatus}
          className="font-mono rounded-full border px-3 py-1.5 text-[11px] font-semibold"
          style={
            status === "upcoming"
              ? {
                  borderColor: "var(--color-teal)",
                  background: "var(--color-teal)",
                  color: "var(--color-paper)",
                }
              : {
                  borderColor: "var(--color-line)",
                  background: "transparent",
                  color: "var(--color-ink-soft)",
                }
          }
        >
          {status === "upcoming" ? "Mark completed" : "Reopen"}
        </button>
      </div>

      <div className="mb-2 sm:max-w-[420px]">
        <EntityPicker
          mode="multi"
          options={people}
          selectedIds={attendeeIds}
          onChange={changeAttendees}
          onCreate={createPersonOption}
          placeholder="Add attendee…"
          icon={Users}
        />
      </div>

      <div className="mb-5 sm:max-w-[420px]">
        <EntityPicker
          mode="multi"
          options={availableTags}
          selectedIds={tagIds}
          onChange={changeTags}
          onCreate={createTagOption}
          placeholder="Add tag…"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div>
          <h2
            className="font-mono mb-1 text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Prep notes
          </h2>
          <div className="mb-4">
            <AutosaveTextarea
              initialValue={meeting.prepNotes}
              onSave={(v) =>
                updateMeetingPrepNotes({ id: meeting.id, notes: v })
              }
              placeholder="Agenda, questions to raise, background…"
              rows={6}
            />
          </div>
          <h2
            className="font-mono mb-1 text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Meeting notes
          </h2>
          <AutosaveTextarea
            initialValue={meeting.meetingNotes}
            onSave={(v) => updateMeetingNotes({ id: meeting.id, notes: v })}
            placeholder="What actually happened…"
            rows={12}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2
              className="font-mono text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Tasks from this meeting
            </h2>
            <button
              type="button"
              onClick={() => setShowAdd((s) => !s)}
              className="font-mono flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-paper-raised)",
              }}
            >
              <Plus size={11} /> New task
            </button>
          </div>
          {showAdd && (
            <AddTaskForm
              projects={projects}
              people={people}
              tags={taskTagOptions}
              meetingId={meeting.id}
              defaultProjectId={null}
              onCancel={() => setShowAdd(false)}
              onCreated={() => {}}
            />
          )}
          {meeting.tasks.length === 0 && !showAdd ? (
            <p
              className="font-mono rounded-[4px] border border-dashed px-3 py-4 text-center text-[12px]"
              style={{
                borderColor: "var(--color-line)",
                color: "var(--color-ink-soft)",
              }}
            >
              No tasks captured yet.
            </p>
          ) : (
            <div>
              {meeting.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  showProject
                  layout="stacked"
                  projects={projects}
                  people={people}
                  tagOptions={taskTagOptions}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={del}
          className="font-mono text-[11px]"
          style={{
            color: confirmDelete
              ? "var(--color-danger)"
              : "var(--color-ink-soft)",
          }}
        >
          {confirmDelete ? "Confirm delete? Tasks are kept." : "Delete meeting"}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-mono ml-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Keep
          </button>
        )}
      </div>
    </div>
  );
}
