import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const projectStatus = pgEnum("project_status", [
  "active",
  "someday_maybe",
  "on_hold",
  "completed",
  "archived",
]);

export const taskStatus = pgEnum("task_status", [
  "inbox",
  "next_action",
  "waiting_on",
  "done",
]);

export const taskContext = pgEnum("task_context", [
  "computer",
  "calls",
  "errands",
  "home",
  "waiting",
]);

/* ------------------------------------------------------------------ */
/* Auth.js tables                                                     */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ */
/* App tables                                                         */
/* ------------------------------------------------------------------ */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: projectStatus("status").notNull().default("active"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("projects_user_status_idx").on(t.userId, t.status),
    index("projects_user_name_idx").on(t.userId, t.name),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: taskStatus("status").notNull().default("next_action"),
    priority: integer("priority").notNull().default(3),
    context: taskContext("context"),
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_user_status_idx").on(t.userId, t.status),
    index("tasks_user_due_priority_idx").on(t.userId, t.dueDate, t.priority),
    index("tasks_user_sort_created_idx").on(
      t.userId,
      t.sortOrder,
      t.createdAt,
    ),
    index("tasks_project_idx").on(t.projectId),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#2E5F5C"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("tags_user_name_uniq").on(t.userId, t.name)],
);

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

export const projectWeeklyNotes = pgTable(
  "project_weekly_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    note: text("note").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("pwn_project_week_uniq").on(t.projectId, t.weekStartDate),
  ],
);

export const weeklyReviews = pgTable(
  "weekly_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    reflectionNotes: text("reflection_notes").notNull().default(""),
    inboxCleared: boolean("inbox_cleared").notNull().default(false),
    loopsCaptured: boolean("loops_captured").notNull().default(false),
  },
  (t) => [
    uniqueIndex("wr_user_week_uniq").on(t.userId, t.weekStartDate),
  ],
);

export const weeklyPriorities = pgTable(
  "weekly_priorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weeklyReviewId: uuid("weekly_review_id")
      .notNull()
      .references(() => weeklyReviews.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("wp_review_task_uniq").on(t.weeklyReviewId, t.taskId),
  ],
);

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("dp_user_date_uniq").on(t.userId, t.date)],
);

export const dailyPlanItems = pgTable(
  "daily_plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dailyPlanId: uuid("daily_plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("dpi_plan_task_uniq").on(t.dailyPlanId, t.taskId),
  ],
);

/* ------------------------------------------------------------------ */
/* Relations                                                          */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  weeklyReviews: many(weeklyReviews),
  dailyPlans: many(dailyPlans),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
  weeklyNotes: many(projectWeeklyNotes),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  tags: many(taskTags),
  weeklyPriorities: many(weeklyPriorities),
  dailyPlanItems: many(dailyPlanItems),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  tasks: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const projectWeeklyNotesRelations = relations(
  projectWeeklyNotes,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectWeeklyNotes.projectId],
      references: [projects.id],
    }),
  }),
);

export const weeklyReviewsRelations = relations(
  weeklyReviews,
  ({ one, many }) => ({
    user: one(users, {
      fields: [weeklyReviews.userId],
      references: [users.id],
    }),
    priorities: many(weeklyPriorities),
  }),
);

export const weeklyPrioritiesRelations = relations(
  weeklyPriorities,
  ({ one }) => ({
    review: one(weeklyReviews, {
      fields: [weeklyPriorities.weeklyReviewId],
      references: [weeklyReviews.id],
    }),
    task: one(tasks, {
      fields: [weeklyPriorities.taskId],
      references: [tasks.id],
    }),
  }),
);

export const dailyPlansRelations = relations(dailyPlans, ({ one, many }) => ({
  user: one(users, { fields: [dailyPlans.userId], references: [users.id] }),
  items: many(dailyPlanItems),
}));

export const dailyPlanItemsRelations = relations(dailyPlanItems, ({ one }) => ({
  plan: one(dailyPlans, {
    fields: [dailyPlanItems.dailyPlanId],
    references: [dailyPlans.id],
  }),
  task: one(tasks, {
    fields: [dailyPlanItems.taskId],
    references: [tasks.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Inferred row types                                                 */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type ProjectWeeklyNote = typeof projectWeeklyNotes.$inferSelect;
export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type WeeklyPriority = typeof weeklyPriorities.$inferSelect;
export type DailyPlan = typeof dailyPlans.$inferSelect;
export type DailyPlanItem = typeof dailyPlanItems.$inferSelect;

/* PRIORITY_TASK_CAP is enforced in server actions — see lib/server/priority-cap.ts */
export const PRIORITY_TASK_CAP = 3;
export const WEEKLY_PRIORITY_CAP = 3;

// Prevent unused-import warning; keep sql exported for downstream use.
void sql;
