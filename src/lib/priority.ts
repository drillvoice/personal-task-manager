import type { Priority } from "@/lib/types";

const NAME_TO_PRIORITY: Record<string, Priority> = { p1: 1, p2: 2, p3: 3 };

export function isPriorityTagName(name: string): boolean {
  return name.toLowerCase() in NAME_TO_PRIORITY;
}

/**
 * Priority is expressed as p1/p2/p3 tags rather than a dedicated field.
 * Returns the highest priority (lowest number) among a task's tag names, or
 * null if none of its tags are a priority tag.
 */
export function priorityFromTagNames(names: string[]): Priority | null {
  let best: Priority | null = null;
  for (const name of names) {
    const p = NAME_TO_PRIORITY[name.toLowerCase()];
    if (p !== undefined && (best === null || p < best)) best = p;
  }
  return best;
}

/** Ascending priority comparator; untagged (null) sorts last. */
export function comparePriority(
  a: Priority | null,
  b: Priority | null,
): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}
