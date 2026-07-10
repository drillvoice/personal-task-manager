import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  meetingAttendees,
  meetingTags,
  meetings,
  people,
  projects,
  tags,
  taskAssignees,
  taskTags,
  tasks,
} from "@/lib/db/schema";
import { isPriorityTagName, priorityFromTagNames } from "@/lib/priority";
import type { TasksViewTask } from "@/lib/server/tasks";

export type MeetingListItem = {
  id: string;
  title: string;
  meetingDate: string;
  status: "upcoming" | "completed";
  attendees: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
  taskCount: number;
};

export type MeetingDetail = Omit<MeetingListItem, "taskCount"> & {
  prepNotes: string;
  meetingNotes: string;
  tasks: TasksViewTask[];
};

export type TagOption = { id: string; name: string; color: string };

export async function loadMeetingsData(userId: string): Promise<{
  meetings: MeetingListItem[];
}> {
  const [meetingRows, attendeeRows, tagRows, taskRows] = await Promise.all([
    db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(asc(meetings.meetingDate), desc(meetings.createdAt)),
    db
      .select({
        meetingId: meetingAttendees.meetingId,
        personId: people.id,
        personName: people.name,
      })
      .from(meetingAttendees)
      .innerJoin(people, eq(meetingAttendees.personId, people.id))
      .innerJoin(meetings, eq(meetingAttendees.meetingId, meetings.id))
      .where(eq(meetings.userId, userId))
      .orderBy(asc(people.name)),
    db
      .select({
        meetingId: meetingTags.meetingId,
        tagId: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(meetingTags)
      .innerJoin(tags, eq(meetingTags.tagId, tags.id))
      .innerJoin(meetings, eq(meetingTags.meetingId, meetings.id))
      .where(eq(meetings.userId, userId)),
    db
      .select({ meetingId: tasks.meetingId })
      .from(tasks)
      .where(eq(tasks.userId, userId)),
  ]);

  const attendeesByMeeting = new Map<string, { id: string; name: string }[]>();
  for (const a of attendeeRows) {
    const list = attendeesByMeeting.get(a.meetingId) ?? [];
    list.push({ id: a.personId, name: a.personName });
    attendeesByMeeting.set(a.meetingId, list);
  }

  const tagsByMeeting = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();
  for (const t of tagRows) {
    const list = tagsByMeeting.get(t.meetingId) ?? [];
    list.push({ id: t.tagId, name: t.name, color: t.color });
    tagsByMeeting.set(t.meetingId, list);
  }

  const taskCountByMeeting = new Map<string, number>();
  for (const t of taskRows) {
    if (!t.meetingId) continue;
    taskCountByMeeting.set(
      t.meetingId,
      (taskCountByMeeting.get(t.meetingId) ?? 0) + 1,
    );
  }

  return {
    meetings: meetingRows.map((m) => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      status: m.status,
      attendees: attendeesByMeeting.get(m.id) ?? [],
      tags: tagsByMeeting.get(m.id) ?? [],
      taskCount: taskCountByMeeting.get(m.id) ?? 0,
    })),
  };
}

export async function loadMeetingDetail(
  userId: string,
  meetingId: string,
): Promise<MeetingDetail | null> {
  const [meetingRow] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
  if (!meetingRow) return null;

  const [attendeeRows, tagRows, taskRows] = await Promise.all([
    db
      .select({ personId: people.id, personName: people.name })
      .from(meetingAttendees)
      .innerJoin(people, eq(meetingAttendees.personId, people.id))
      .where(eq(meetingAttendees.meetingId, meetingId))
      .orderBy(asc(people.name)),
    db
      .select({ tagId: tags.id, name: tags.name, color: tags.color })
      .from(meetingTags)
      .innerJoin(tags, eq(meetingTags.tagId, tags.id))
      .where(eq(meetingTags.meetingId, meetingId)),
    db
      .select({
        task: tasks,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.meetingId, meetingId), eq(tasks.userId, userId)))
      .orderBy(asc(tasks.createdAt)),
  ]);

  const taskIds = taskRows.map((r) => r.task.id);
  const [assigneeRows, taskTagRows] = await Promise.all([
    taskIds.length
      ? db
          .select({
            taskId: taskAssignees.taskId,
            id: people.id,
            name: people.name,
          })
          .from(taskAssignees)
          .innerJoin(people, eq(taskAssignees.personId, people.id))
          .where(inArray(taskAssignees.taskId, taskIds))
          .orderBy(asc(people.name))
      : Promise.resolve([]),
    taskIds.length
      ? db
          .select({
            taskId: taskTags.taskId,
            id: tags.id,
            name: tags.name,
            color: tags.color,
          })
          .from(taskTags)
          .innerJoin(tags, eq(taskTags.tagId, tags.id))
          .where(inArray(taskTags.taskId, taskIds))
          .orderBy(asc(tags.name))
      : Promise.resolve([]),
  ]);

  const assigneesByTask = new Map<string, { id: string; name: string }[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ id: a.id, name: a.name });
    assigneesByTask.set(a.taskId, list);
  }

  const tagsByTask = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();
  for (const t of taskTagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }

  return {
    id: meetingRow.id,
    title: meetingRow.title,
    meetingDate: meetingRow.meetingDate,
    status: meetingRow.status,
    prepNotes: meetingRow.prepNotes,
    meetingNotes: meetingRow.meetingNotes,
    attendees: attendeeRows.map((a) => ({ id: a.personId, name: a.personName })),
    tags: tagRows.map((t) => ({ id: t.tagId, name: t.name, color: t.color })),
    tasks: taskRows.map((r) => {
      const allTags = tagsByTask.get(r.task.id) ?? [];
      return {
        id: r.task.id,
        title: r.task.title,
        priority: priorityFromTagNames(allTags.map((tg) => tg.name)),
        status: r.task.status,
        dueDate: r.task.dueDate,
        notes: r.task.notes,
        projectId: r.task.projectId,
        projectName: r.projectName ?? null,
        assignees: assigneesByTask.get(r.task.id) ?? [],
        tags: allTags.filter((tg) => !isPriorityTagName(tg.name)),
      };
    }),
  };
}

export async function loadTagOptions(userId: string): Promise<TagOption[]> {
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.kind, "meeting")))
    .orderBy(asc(tags.name));
}
