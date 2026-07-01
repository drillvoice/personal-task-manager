export type Priority = 1 | 2 | 3;

export type ProjectStatus =
  | "active"
  | "someday_maybe"
  | "on_hold"
  | "completed"
  | "archived";

export type TaskStatus = "inbox" | "next_action" | "waiting_on" | "done";

export type Context =
  | "@computer"
  | "@calls"
  | "@errands"
  | "@home"
  | "@waiting";

export const CONTEXTS: Context[] = [
  "@computer",
  "@calls",
  "@errands",
  "@home",
  "@waiting",
];

/**
 * `null` project_id → Inbox (a pseudo-project rendered in Tasks but excluded
 * from the Projects history table).
 */
export const INBOX_PROJECT_ID = null;
