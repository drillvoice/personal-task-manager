import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { recentWeekStarts, weekStartIso } from "@/lib/time";

/**
 * Seeds the dev database with the mockup's fixture projects & tasks so the
 * app is populated on first boot. Idempotent: rerunning wipes and reinserts
 * the seed user's data. Guarded against running in production.
 */
async function run() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed against a production database.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const email = process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("ALLOWED_EMAIL is not set");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  const user =
    existing ??
    (
      await db
        .insert(schema.users)
        .values({ email, name: "Joel" })
        .returning()
    )[0];

  console.log(`→ seeding as ${user.email} (${user.id})`);

  await db.delete(schema.projects).where(eq(schema.projects.userId, user.id));

  // Priority is a p1/p2/p3 task tag rather than a dedicated field — find or
  // create the tag for this user so seed tasks can be attached to it.
  const priorityTagIds = new Map<number, string>();
  async function priorityTagId(priority: 1 | 2 | 3): Promise<string> {
    const cached = priorityTagIds.get(priority);
    if (cached) return cached;
    const name = `p${priority}`;
    const [existing] = await db
      .select()
      .from(schema.tags)
      .where(
        and(
          eq(schema.tags.userId, user.id),
          eq(schema.tags.kind, "task"),
          eq(schema.tags.name, name),
        ),
      );
    const id =
      existing?.id ??
      (
        await db
          .insert(schema.tags)
          .values({ userId: user.id, name, kind: "task" })
          .returning()
      )[0].id;
    priorityTagIds.set(priority, id);
    return id;
  }

  const weeks = recentWeekStarts(4);

  const seed = [
    {
      name: "Better Renting — Board update",
      status: "active" as const,
      notes:
        "Board wants the Q3 impact numbers before the funding conversation. Need Tara Cheyne's office to confirm the meeting slot.",
      weeklyNotes: {
        [weeks[0]]: "Kicked off Q3 report structure.",
        [weeks[1]]: "Waiting on finance figures from ops.",
        [weeks[3]]:
          "Board wants Q3 numbers before funding conversation. Tara Cheyne's office to confirm slot.",
      },
      tasks: [
        {
          title: "Draft Q3 impact report outline",
          status: "next_action" as const,
          priority: 2 as const,
        },
        {
          title: "Follow up with Tara Cheyne's office",
          status: "waiting_on" as const,
          priority: 1 as const,
        },
      ],
    },
    {
      name: "ELAN — EC responsibilities",
      status: "active" as const,
      notes:
        "Pipe repair invoice needs sign-off. Gate quote still outstanding from the contractor.",
      weeklyNotes: {
        [weeks[0]]: "Pipe repair scheduled with plumber.",
        [weeks[1]]: "Plasterer booked for following week.",
        [weeks[2]]: "Invoice received, needs EC sign-off.",
        [weeks[3]]: "Approved pipe repair invoice. Still chasing gate quote.",
      },
      tasks: [
        {
          title: "Approve pipe repair invoice",
          status: "next_action" as const,
          priority: 1 as const,
        },
        {
          title: "Chase gate repair quote",
          status: "waiting_on" as const,
          priority: 3 as const,
        },
      ],
    },
    {
      name: "Watson property purchase",
      status: "active" as const,
      notes:
        "Offer accepted. Now working through due diligence before finance is locked in.",
      weeklyNotes: {
        [weeks[1]]: "Offer accepted!",
        [weeks[2]]: "Contract review with conveyancer.",
        [weeks[3]]: "Confirming building & pest inspection date.",
      },
      tasks: [
        {
          title: "Confirm building & pest inspection date",
          status: "next_action" as const,
          priority: 1 as const,
        },
      ],
    },
    {
      name: "Summer Foundation — accessibility standards",
      status: "active" as const,
      notes:
        "Reviewing the latest draft standard before next working group session.",
      weeklyNotes: {
        [weeks[0]]: "Draft standard v2 circulated.",
        [weeks[2]]: "Feedback compiled for working group.",
        [weeks[3]]: "Reading draft standard v3.",
      },
      tasks: [
        {
          title: "Read draft standard v3",
          status: "next_action" as const,
          priority: 3 as const,
        },
      ],
    },
    {
      name: "Frosthaven — outpost phase",
      status: "someday_maybe" as const,
      notes: "",
      weeklyNotes: {
        [weeks[3]]: "Read outpost rules before next session.",
      },
      tasks: [
        {
          title: "Read outpost rules before next session",
          status: "next_action" as const,
          priority: 3 as const,
        },
      ],
    },
  ];

  for (const p of seed) {
    const [project] = await db
      .insert(schema.projects)
      .values({
        userId: user.id,
        name: p.name,
        status: p.status,
        notes: p.notes,
      })
      .returning();

    for (const t of p.tasks) {
      const [task] = await db
        .insert(schema.tasks)
        .values({
          userId: user.id,
          projectId: project.id,
          title: t.title,
          status: t.status,
        })
        .returning();
      await db.insert(schema.taskTags).values({
        taskId: task.id,
        tagId: await priorityTagId(t.priority),
      });
    }

    for (const [week, note] of Object.entries(p.weeklyNotes)) {
      await db.insert(schema.projectWeeklyNotes).values({
        projectId: project.id,
        weekStartDate: week,
        note,
      });
    }
  }

  // A current-week weekly review, freshly started.
  await db
    .delete(schema.weeklyReviews)
    .where(eq(schema.weeklyReviews.userId, user.id));

  await db.insert(schema.weeklyReviews).values({
    userId: user.id,
    weekStartDate: weekStartIso(),
  });

  console.log(`✓ seeded ${seed.length} projects`);
  await client.end();
}

run().catch((err) => {
  console.error("✗ seed failed:", err);
  process.exit(1);
});
