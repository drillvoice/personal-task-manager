/**
 * The "exactly 3" caps.
 *
 * Kept out of `lib/db/schema.ts` so client components can read them without
 * dragging Drizzle into the browser bundle — before this, `review-view.tsx`
 * redeclared its own `WEEKLY_CAP = 3` for exactly that reason. `schema.ts`
 * re-exports both, so server-side imports are unaffected.
 *
 * Enforced in server actions — see `lib/server/priority-cap.ts`.
 */
export const PRIORITY_TASK_CAP = 3;
export const WEEKLY_PRIORITY_CAP = 3;
