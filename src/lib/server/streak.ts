import { addWeeks, differenceInCalendarWeeks, format, parseISO } from "date-fns";

export type ReviewSummary = {
  weekStartDate: string; // yyyy-MM-dd, always Monday
  completedAt: Date | null;
};

/**
 * Count of consecutive completed reviews immediately preceding the *previous*
 * week. The current week's review doesn't count (it's the one being worked
 * on). Returns 0 if last week's review is missing, since a streak breaks.
 *
 * Example: today = week 2026-06-29, and 2026-06-22 + 2026-06-15 both
 * completed but 2026-06-08 didn't → streak is 2.
 */
export function computeStreak(
  reviews: ReviewSummary[],
  currentWeekStartIso: string,
): number {
  const completed = new Map<string, Date>();
  for (const r of reviews) {
    if (r.completedAt) completed.set(r.weekStartDate, r.completedAt);
  }

  const current = parseISO(currentWeekStartIso);
  let streak = 0;
  let cursor = addWeeks(current, -1);
  const guard = 260; // 5 years — plenty for a paranoia bound
  for (let i = 0; i < guard; i++) {
    const iso = format(cursor, "yyyy-MM-dd");
    if (!completed.has(iso)) break;
    streak++;
    cursor = addWeeks(cursor, -1);
  }
  return streak;
}

export function lastCompletedReview(
  reviews: ReviewSummary[],
): ReviewSummary | null {
  const completed = reviews.filter((r) => r.completedAt);
  if (completed.length === 0) return null;
  completed.sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
  return completed[0] ?? null;
}

/**
 * Human label for the streak header — "4-week streak · last completed Mon 22 Jun"
 * or "First review" etc.
 */
export function streakLabel(
  streak: number,
  lastCompleted: Date | null,
  fmt: (d: Date) => string,
): string {
  if (streak === 0 && !lastCompleted) return "First review";
  const streakPart =
    streak > 0 ? `${streak}-week streak` : "No active streak";
  if (!lastCompleted) return streakPart;
  return `${streakPart} · last completed ${fmt(lastCompleted)}`;
}

// exported so tests can assert against a stable time reference
export function weeksBetween(a: string, b: string): number {
  return differenceInCalendarWeeks(parseISO(b), parseISO(a), {
    weekStartsOn: 1,
  });
}
