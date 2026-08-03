import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

/**
 * Archiving is "put this aside until there's work again" — so giving an
 * archived project a task brings it straight back. Safe to call on every task
 * write: the `status = archived` predicate makes it a no-op otherwise.
 *
 * Deliberately not folded into the caller's `db.batch`. neon-http has no
 * interactive transactions, and a failure here is benign: the task still
 * lands, and the next assignment reactivates the project.
 */
export async function reactivateArchivedProject(
  userId: string,
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) return;
  await db
    .update(projects)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.userId, userId),
        eq(projects.status, "archived"),
      ),
    );
}
