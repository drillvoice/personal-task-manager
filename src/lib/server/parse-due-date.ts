import "server-only";
import * as chrono from "chrono-node";
import { todayIso } from "@/lib/time";

export type ParsedTitle = { title: string; dueDate: string | null };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Pulls a natural-language date phrase ("in 14 days", "tomorrow", "next
 * Friday") out of a task title and resolves it to a `yyyy-MM-dd` due date,
 * returning the title with that phrase stripped out — the same shape as the
 * `#tag` extraction the quick-add flow already does.
 *
 * chrono resolves relative dates against a reference Date read in the
 * *runtime's* local timezone, which on Vercel is UTC — so we anchor the
 * reference to today's calendar date in APP_TZ (via `todayIso`) as a local
 * noon Date, and read the result back out of its local components. Staying in
 * "local component space" the whole way keeps the answer correct regardless of
 * server tz, and the noon anchor keeps a DST edge from flipping the day.
 */
export function extractDueDate(
  rawTitle: string,
  now: Date = new Date(),
): ParsedTitle {
  const [y, m, d] = todayIso(now).split("-").map(Number);
  const reference = new Date(y, m - 1, d, 12, 0, 0, 0);
  const [result] = chrono.parse(rawTitle, reference, { forwardDate: true });
  if (!result) return { title: rawTitle.trim(), dueDate: null };

  const dt = result.start.date();
  const dueDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const title = (
    rawTitle.slice(0, result.index) +
    rawTitle.slice(result.index + result.text.length)
  )
    .replace(/\s+/g, " ")
    .trim();

  // A title that is *only* a date phrase ("tomorrow") isn't a due date on an
  // empty task — leave it untouched rather than strand the user with a blank
  // title that fails validation.
  if (!title) return { title: rawTitle.trim(), dueDate: null };

  return { title, dueDate };
}
