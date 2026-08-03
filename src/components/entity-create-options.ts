"use client";

import { createProject } from "@/app/(app)/projects/actions";
import { createPerson } from "@/app/(app)/people/actions";
import { createTaskTag } from "@/app/(app)/tasks/actions";
import { createTag } from "@/app/(app)/meetings/actions";
import type { PickerOption } from "@/components/entity-picker";

/**
 * `onCreate` adapters for EntityPicker: turn a typed-in name into a new row and
 * hand back the option to select, or null if the action rejected it.
 *
 * Task tags and meeting tags are separate vocabularies (`tags.kind`), so the
 * two tag adapters are deliberately not interchangeable — a picker over meeting
 * tags that minted task tags would file the new tag where nothing reads it.
 */

export async function createProjectOption(
  name: string,
): Promise<PickerOption | null> {
  const res = await createProject({ name, status: "active" });
  return res.ok ? { id: res.id, name } : null;
}

export async function createPersonOption(
  name: string,
): Promise<PickerOption | null> {
  const res = await createPerson({ name });
  return res.ok ? { id: res.id, name } : null;
}

export async function createTaskTagOption(
  name: string,
): Promise<PickerOption | null> {
  const res = await createTaskTag({ name });
  return res.ok ? { id: res.id, name: res.name, color: res.color } : null;
}

export async function createMeetingTagOption(
  name: string,
): Promise<PickerOption | null> {
  const res = await createTag({ name });
  return res.ok ? { id: res.id, name: res.name, color: res.color } : null;
}
