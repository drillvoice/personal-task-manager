import "server-only";
import { asc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectWeeklyNotes, projects } from "@/lib/db/schema";
import { weekLabel, weekStartIso } from "@/lib/time";

export type ProjectsTableRow = {
  id: string;
  name: string;
  status: "active" | "someday_maybe" | "on_hold" | "completed" | "archived";
  notesByWeek: Record<string, string>;
};

export type ProjectsTableData = {
  weeks: { start: string; label: string; isCurrent: boolean }[];
  rows: ProjectsTableRow[];
};

/**
 * Columns are only weeks where *some* project has a non-empty note, plus
 * the current week (always shown so there's a place to write today's
 * update). This keeps a fresh account from showing 12 empty pre-history
 * columns.
 */
export async function loadProjectsTable(
  userId: string,
): Promise<ProjectsTableData> {
  const [projectRows, notes] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.name)),
    db
      .select(getTableColumns(projectWeeklyNotes))
      .from(projectWeeklyNotes)
      .innerJoin(projects, eq(projectWeeklyNotes.projectId, projects.id))
      .where(eq(projects.userId, userId)),
  ]);

  const currentWeek = weekStartIso();
  const populatedWeeks = new Set<string>([currentWeek]);
  for (const n of notes) {
    if (n.note.trim()) populatedWeeks.add(n.weekStartDate);
  }
  const weekStarts = Array.from(populatedWeeks).sort();

  const notesByProject = new Map<string, Map<string, string>>();
  for (const n of notes) {
    const inner = notesByProject.get(n.projectId) ?? new Map();
    inner.set(n.weekStartDate, n.note);
    notesByProject.set(n.projectId, inner);
  }

  const rows: ProjectsTableRow[] = projectRows.map((p) => {
    const inner = notesByProject.get(p.id) ?? new Map();
    const notesByWeek: Record<string, string> = {};
    for (const w of weekStarts) notesByWeek[w] = inner.get(w) ?? "";
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      notesByWeek,
    };
  });

  return {
    weeks: weekStarts.map((w) => ({
      start: w,
      label: weekLabel(w),
      isCurrent: w === currentWeek,
    })),
    rows,
  };
}
