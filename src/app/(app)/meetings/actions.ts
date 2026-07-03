"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  meetingAttendees,
  meetingTags,
  meetings,
  people,
  tags,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const titleField = z.string().trim().min(1, "Title is required").max(200);
const notesField = z.string().max(50000);
const idList = z.array(z.string().uuid()).max(100);

async function ownedMeetingId(
  userId: string,
  meetingId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
  return row?.id ?? null;
}

// Junction tables carry no userId, so submitted ids must be checked against
// the user's own rows before inserting.
async function ownedPersonIds(
  userId: string,
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, ids)));
  return rows.length === ids.length;
}

async function ownedTagIds(userId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "meeting"),
        inArray(tags.id, ids),
      ),
    );
  return rows.length === ids.length;
}

const createMeetingSchema = z.object({
  title: titleField,
  meetingDate: dateField,
  attendeeIds: idList.default([]),
});

export type CreateMeetingInput = z.input<typeof createMeetingSchema>;

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { title, meetingDate, attendeeIds } = parsed.data;
  const uniqueAttendees = [...new Set(attendeeIds)];
  if (!(await ownedPersonIds(userId, uniqueAttendees))) {
    return { ok: false, error: "Unknown attendee" };
  }
  const [row] = await db
    .insert(meetings)
    .values({ userId, title, meetingDate })
    .returning({ id: meetings.id });
  if (uniqueAttendees.length > 0) {
    await db.insert(meetingAttendees).values(
      uniqueAttendees.map((personId) => ({ meetingId: row.id, personId })),
    );
  }
  revalidatePath("/meetings");
  return { ok: true, id: row.id };
}

const updateMeetingSchema = z.object({
  id: z.string().uuid(),
  title: titleField,
  meetingDate: dateField,
});

export type UpdateMeetingInput = z.input<typeof updateMeetingSchema>;

export async function updateMeeting(
  input: UpdateMeetingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(meetings)
    .set({
      title: parsed.data.title,
      meetingDate: parsed.data.meetingDate,
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, parsed.data.id), eq(meetings.userId, userId)))
    .returning({ id: meetings.id });
  if (!updated) return { ok: false, error: "Meeting not found" };
  revalidatePath("/meetings");
  return { ok: true };
}

const setAttendeesSchema = z.object({
  id: z.string().uuid(),
  attendeeIds: idList,
});

export async function setMeetingAttendees(
  input: z.input<typeof setAttendeesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = setAttendeesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const meetingId = await ownedMeetingId(userId, parsed.data.id);
  if (!meetingId) return { ok: false, error: "Meeting not found" };
  const uniqueAttendees = [...new Set(parsed.data.attendeeIds)];
  if (!(await ownedPersonIds(userId, uniqueAttendees))) {
    return { ok: false, error: "Unknown attendee" };
  }
  await db
    .delete(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId));
  if (uniqueAttendees.length > 0) {
    await db.insert(meetingAttendees).values(
      uniqueAttendees.map((personId) => ({ meetingId, personId })),
    );
  }
  revalidatePath("/meetings");
  return { ok: true };
}

const notesSchema = z.object({ id: z.string().uuid(), notes: notesField });

// Autosave targets: deliberately no revalidatePath here. Revalidating the
// detail route would re-render the server component underneath a textarea
// the user is still typing into; the list page shows no note content, so
// nothing user-visible goes stale.
export async function updateMeetingPrepNotes(
  input: z.input<typeof notesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(meetings)
    .set({ prepNotes: parsed.data.notes, updatedAt: new Date() })
    .where(and(eq(meetings.id, parsed.data.id), eq(meetings.userId, userId)))
    .returning({ id: meetings.id });
  if (!updated) return { ok: false, error: "Meeting not found" };
  return { ok: true };
}

export async function updateMeetingNotes(
  input: z.input<typeof notesSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(meetings)
    .set({ meetingNotes: parsed.data.notes, updatedAt: new Date() })
    .where(and(eq(meetings.id, parsed.data.id), eq(meetings.userId, userId)))
    .returning({ id: meetings.id });
  if (!updated) return { ok: false, error: "Meeting not found" };
  return { ok: true };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["upcoming", "completed"]),
});

export async function setMeetingStatus(
  input: z.input<typeof statusSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [updated] = await db
    .update(meetings)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(meetings.id, parsed.data.id), eq(meetings.userId, userId)))
    .returning({ id: meetings.id });
  if (!updated) return { ok: false, error: "Meeting not found" };
  revalidatePath("/meetings");
  return { ok: true };
}

const setTagsSchema = z.object({ id: z.string().uuid(), tagIds: idList });

export async function setMeetingTags(
  input: z.input<typeof setTagsSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = setTagsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const meetingId = await ownedMeetingId(userId, parsed.data.id);
  if (!meetingId) return { ok: false, error: "Meeting not found" };
  const uniqueTags = [...new Set(parsed.data.tagIds)];
  if (!(await ownedTagIds(userId, uniqueTags))) {
    return { ok: false, error: "Unknown tag" };
  }
  await db.delete(meetingTags).where(eq(meetingTags.meetingId, meetingId));
  if (uniqueTags.length > 0) {
    await db.insert(meetingTags).values(
      uniqueTags.map((tagId) => ({ meetingId, tagId })),
    );
  }
  revalidatePath("/meetings");
  return { ok: true };
}

const createTagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

export async function createTag(
  input: z.input<typeof createTagSchema>,
): Promise<
  | { ok: true; id: string; name: string; color: string }
  | { ok: false; error: string }
> {
  const userId = await requireUserId();
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const name = parsed.data.name;
  const [existing] = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.kind, "meeting"),
        eq(tags.name, name),
      ),
    );
  if (existing) return { ok: true, ...existing };
  const [row] = await db
    .insert(tags)
    .values({ userId, name, kind: "meeting" })
    .returning({ id: tags.id, name: tags.name, color: tags.color });
  return { ok: true, ...row };
}

export async function deleteMeeting(
  meetingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)))
    .returning({ id: meetings.id });
  if (!deleted) return { ok: false, error: "Meeting not found" };
  revalidatePath("/meetings");
  revalidatePath("/tasks");
  return { ok: true };
}
