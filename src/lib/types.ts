export type Priority = 1 | 2 | 3;

/**
 * Mirrors the `project_status` enum. Only `active`, `someday_maybe` and
 * `archived` are reachable from the UI — `on_hold` and `completed` are dormant
 * members with no behaviour anywhere.
 */
export type ProjectStatus =
  | "active"
  | "someday_maybe"
  | "on_hold"
  | "completed"
  | "archived";

export type TaskStatus = "inbox" | "next_action" | "waiting_on" | "done";
