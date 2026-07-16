"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, organisations, people, personGroups } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server/session";

function revalidateContactViews() {
  revalidatePath("/people");
  revalidatePath("/tasks");
  revalidatePath("/meetings");
}

const orgIdField = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal("").transform(() => null));

const groupIdsField = z.array(z.string().uuid()).max(100).default([]);

// Junction tables carry no userId, so submitted ids must be checked against
// the user's own rows before inserting.
async function ownedGroupIds(userId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.userId, userId), inArray(groups.id, ids)));
  return rows.length === ids.length;
}

async function setPersonGroups(personId: string, groupIds: string[]) {
  const unique = [...new Set(groupIds)];
  await db.batch([
    db.delete(personGroups).where(eq(personGroups.personId, personId)),
    ...(unique.length > 0
      ? [
          db
            .insert(personGroups)
            .values(unique.map((groupId) => ({ personId, groupId }))),
        ]
      : []),
  ]);
}

const personFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  role: z.string().trim().max(200).default(""),
  email: z.string().trim().max(320).default(""),
  phone: z.string().trim().max(50).default(""),
  notes: z.string().max(5000).default(""),
  organisationId: orgIdField.default(null),
  groupIds: groupIdsField,
};

const createPersonSchema = z.object(personFields);

export type CreatePersonInput = z.input<typeof createPersonSchema>;

export async function createPerson(
  input: CreatePersonInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createPersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { groupIds, ...fields } = parsed.data;
  if (!(await ownedGroupIds(userId, groupIds))) {
    return { ok: false, error: "Unknown group" };
  }
  const [row] = await db
    .insert(people)
    .values({ userId, ...fields })
    .returning({ id: people.id });
  if (groupIds.length > 0) await setPersonGroups(row.id, groupIds);
  revalidateContactViews();
  return { ok: true, id: row.id };
}

const updatePersonSchema = z.object({ id: z.string().uuid(), ...personFields });

export type UpdatePersonInput = z.input<typeof updatePersonSchema>;

export async function updatePerson(
  input: UpdatePersonInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updatePersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, groupIds, ...fields } = parsed.data;
  if (!(await ownedGroupIds(userId, groupIds))) {
    return { ok: false, error: "Unknown group" };
  }
  const [updated] = await db
    .update(people)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .returning({ id: people.id });
  if (!updated) return { ok: false, error: "Person not found" };
  await setPersonGroups(id, groupIds);
  revalidateContactViews();
  return { ok: true };
}

export async function deletePerson(
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .returning({ id: people.id });
  if (!deleted) return { ok: false, error: "Person not found" };
  revalidateContactViews();
  return { ok: true };
}

const orgFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().max(5000).default(""),
};

const createOrgSchema = z.object(orgFields);

export type CreateOrganisationInput = z.input<typeof createOrgSchema>;

export async function createOrganisation(
  input: CreateOrganisationInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [row] = await db
    .insert(organisations)
    .values({ userId, ...parsed.data })
    .returning({ id: organisations.id });
  revalidateContactViews();
  return { ok: true, id: row.id };
}

const updateOrgSchema = z.object({ id: z.string().uuid(), ...orgFields });

export type UpdateOrganisationInput = z.input<typeof updateOrgSchema>;

export async function updateOrganisation(
  input: UpdateOrganisationInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, ...fields } = parsed.data;
  const [updated] = await db
    .update(organisations)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(organisations.id, id), eq(organisations.userId, userId)))
    .returning({ id: organisations.id });
  if (!updated) return { ok: false, error: "Organisation not found" };
  revalidateContactViews();
  return { ok: true };
}

export async function deleteOrganisation(
  organisationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(organisations)
    .where(
      and(
        eq(organisations.id, organisationId),
        eq(organisations.userId, userId),
      ),
    )
    .returning({ id: organisations.id });
  if (!deleted) return { ok: false, error: "Organisation not found" };
  revalidateContactViews();
  return { ok: true };
}

const groupFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().max(5000).default(""),
};

const createGroupSchema = z.object(groupFields);

export type CreateGroupInput = z.input<typeof createGroupSchema>;

export async function createGroup(
  input: CreateGroupInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [row] = await db
    .insert(groups)
    .values({ userId, ...parsed.data })
    .returning({ id: groups.id });
  revalidateContactViews();
  return { ok: true, id: row.id };
}

const updateGroupSchema = z.object({ id: z.string().uuid(), ...groupFields });

export type UpdateGroupInput = z.input<typeof updateGroupSchema>;

export async function updateGroup(
  input: UpdateGroupInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, ...fields } = parsed.data;
  const [updated] = await db
    .update(groups)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(groups.id, id), eq(groups.userId, userId)))
    .returning({ id: groups.id });
  if (!updated) return { ok: false, error: "Group not found" };
  revalidateContactViews();
  return { ok: true };
}

export async function deleteGroup(
  groupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const [deleted] = await db
    .delete(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
    .returning({ id: groups.id });
  if (!deleted) return { ok: false, error: "Group not found" };
  revalidateContactViews();
  return { ok: true };
}
