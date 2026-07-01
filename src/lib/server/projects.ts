import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectWeeklyNotes, projects } from "@/lib/db/schema";
import { recentWeekStarts, weekLabel } from "@/lib/time";

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

export async function loadProjectsTable(
  userId: string,
  weekCount = 12,
): Promise<ProjectsTableData> {
  const weekStarts = recentWeekStarts(weekCount);
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.name));

  const projectIds = projectRows.map((p) => p.id);
  const notes = projectIds.length
    ? await db
        .select()
        .from(projectWeeklyNotes)
        .where(inArray(projectWeeklyNotes.projectId, projectIds))
    : [];

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

  const currentWeek = weekStarts[weekStarts.length - 1];
  return {
    weeks: weekStarts.map((w) => ({
      start: w,
      label: weekLabel(w),
      isCurrent: w === currentWeek,
    })),
    rows,
  };
}
