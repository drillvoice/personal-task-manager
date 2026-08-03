import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  formatISO,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const APP_TZ = "Australia/Sydney";

/**
 * A `yyyy-MM-dd` string as an instant at midnight in the *runtime's* zone.
 *
 * Every date-string entry point below goes through this, so the one place that
 * decides how a bare date becomes a Date is here rather than repeated inline —
 * see `tomorrowIso` for what happens when a date string and an instant get
 * confused for one another.
 */
function parseIsoDate(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00`);
}

export function todayIso(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TZ, "yyyy-MM-dd");
}

/**
 * Shift a `yyyy-MM-dd` string by whole calendar days, returning `yyyy-MM-dd`.
 * Works on the date string itself (not an instant) so it never drifts across a
 * timezone offset — the same reason tomorrowIso avoids toZonedTime here.
 */
export function addDaysIso(dateIso: string, days: number): string {
  return formatISO(addDays(parseIsoDate(dateIso), days), {
    representation: "date",
  });
}

/**
 * Human label for a `yyyy-MM-dd` string, e.g. "Thursday, 1 January 2099".
 * Formats the date string in place. Parsing it into an instant and formatting
 * that in APP_TZ happens to agree while Sydney runs ahead of the runtime's
 * zone, but it is the same double-offset trap tomorrowIso documents.
 */
export function formatDateIso(dateIso: string, pattern: string): string {
  return format(parseIsoDate(dateIso), pattern);
}

export function tomorrowIso(now: Date = new Date()): string {
  // Add the calendar day to the *Sydney* date string, not to the instant.
  // Chaining toZonedTime → formatInTimeZone double-applies the tz offset and,
  // on a UTC runtime (Vercel), pushes the result an extra day forward.
  return addDaysIso(todayIso(now), 1);
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
  return weekStartIso(parseIsoDate(dateIso));
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
  return formatInTimeZone(parseIsoDate(weekStartIsoDate), APP_TZ, "d MMM");
}

/**
 * "w/b Mon 13 Jul" — a week named by the Monday that keys it. Used wherever a
 * whole review/week is referred to (history, completed card, export), as
 * opposed to the compact column label above.
 */
export function weekBeginningLabel(weekStartIsoDate: string): string {
  return `w/b ${formatInTimeZone(
    parseIsoDate(weekStartIsoDate),
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
  const target = parseIsoDate(dateIso);
  return isSameDay(toZonedTime(target, APP_TZ), toZonedTime(now, APP_TZ));
}

export function isOverdue(dateIso: string, now: Date = new Date()): boolean {
  const today = parseIsoDate(todayIso(now));
  const target = parseIsoDate(dateIso);
  return target < today;
}

/**
 * "Today" / "Tomorrow" / "Fri" / "15 Jul" for a due_date, matching the
 * mockup's compact metadata style.
 */
export function dueLabel(dateIso: string, now: Date = new Date()): string {
  const target = parseIsoDate(dateIso);
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
