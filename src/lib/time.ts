import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  formatISO,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const APP_TZ = "Australia/Sydney";

export function nowInTz(now: Date = new Date()): Date {
  return toZonedTime(now, APP_TZ);
}

export function todayIso(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TZ, "yyyy-MM-dd");
}

export function tomorrowIso(now: Date = new Date()): string {
  return formatInTimeZone(addDays(toZonedTime(now, APP_TZ), 1), APP_TZ, "yyyy-MM-dd");
}

/**
 * The Monday that keys the week containing `zoned`. Weeks run **Sunday →
 * Saturday**, but are keyed (and labelled) by the Monday inside that span.
 * That means a Sunday belongs to the *upcoming* Monday's week — Joel
 * sometimes does the weekly review on the Sunday ahead of the week it covers,
 * and it should file under that week, not the one just ending.
 */
function weekAnchorMonday(zoned: Date): Date {
  const sunday = startOfWeek(startOfDay(zoned), { weekStartsOn: 0 });
  return addDays(sunday, 1);
}

/**
 * Week bucket for the given moment. Returns `yyyy-MM-dd` of the Monday that
 * keys the week (see `weekAnchorMonday`), in the app timezone. Used to key
 * `weekly_reviews` and `project_weekly_notes`.
 */
export function weekStartIso(now: Date = new Date()): string {
  const monday = weekAnchorMonday(toZonedTime(now, APP_TZ));
  return formatISO(monday, { representation: "date" });
}

export function weekStartFromIso(dateIso: string): string {
  return weekStartIso(new Date(`${dateIso}T00:00:00`));
}

/**
 * Rolling window of the last N Monday-anchored week starts, oldest → newest.
 */
export function recentWeekStarts(count: number, now: Date = new Date()): string[] {
  const currentMonday = weekAnchorMonday(toZonedTime(now, APP_TZ));
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(formatISO(addWeeks(currentMonday, -i), { representation: "date" }));
  }
  return out;
}

/** "9 Jun" style label for the history table columns. */
export function weekLabel(weekStartIsoDate: string): string {
  return formatInTimeZone(new Date(`${weekStartIsoDate}T00:00:00`), APP_TZ, "d MMM");
}

/**
 * "w/b Mon 13 Jul" — a week named by the Monday that keys it. Used wherever a
 * whole review/week is referred to (history, completed card, export), as
 * opposed to the compact column label above.
 */
export function weekBeginningLabel(weekStartIsoDate: string): string {
  return `w/b ${formatInTimeZone(
    new Date(`${weekStartIsoDate}T00:00:00`),
    APP_TZ,
    "EEE d MMM",
  )}`;
}

/**
 * "Mon 6 Jul" style label. Uses a fixed date-fns format rather than
 * `toLocaleDateString`, whose output depends on the runtime's default
 * locale — that mismatch between server (Node) and client (browser)
 * locale caused a hydration error.
 */
export function shortDateLabel(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "EEE d MMM");
}

/**
 * Whole calendar days from `past` to now, both anchored to the app timezone.
 * Same-day → 0, yesterday → 1. Used to age out a completed review.
 */
export function daysSince(past: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(toZonedTime(now, APP_TZ), toZonedTime(past, APP_TZ));
}

export function isToday(dateIso: string, now: Date = new Date()): boolean {
  const target = new Date(`${dateIso}T00:00:00`);
  return isSameDay(toZonedTime(target, APP_TZ), toZonedTime(now, APP_TZ));
}

export function isOverdue(dateIso: string, now: Date = new Date()): boolean {
  const today = new Date(`${todayIso(now)}T00:00:00`);
  const target = new Date(`${dateIso}T00:00:00`);
  return target < today;
}

/**
 * "Today" / "Tomorrow" / "Fri" / "15 Jul" for a due_date, matching the
 * mockup's compact metadata style.
 */
export function dueLabel(dateIso: string, now: Date = new Date()): string {
  const target = new Date(`${dateIso}T00:00:00`);
  const zonedTarget = toZonedTime(target, APP_TZ);
  const zonedNow = toZonedTime(now, APP_TZ);
  if (isSameDay(zonedTarget, zonedNow)) return "Today";
  if (isSameDay(zonedTarget, addDays(zonedNow, 1))) return "Tomorrow";
  // Six-day window, not seven: a date exactly a week out would render as
  // today's weekday name and read as this week.
  const inSixDays = addDays(zonedNow, 6);
  if (zonedTarget > zonedNow && zonedTarget <= inSixDays) {
    return formatInTimeZone(target, APP_TZ, "EEE");
  }
  return formatInTimeZone(target, APP_TZ, "d MMM");
}
