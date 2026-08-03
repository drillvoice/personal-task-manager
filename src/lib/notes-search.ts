/**
 * Escape a user's search text for use inside an ILIKE pattern.
 *
 * Note search wraps the query in `%…%`, so any `%` or `_` the user typed would
 * otherwise act as a wildcard — searching "50%" would match every note. The
 * backslash must be escaped first or it would double-escape the two it then
 * introduces.
 */
export function escapeLikePattern(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);
}

/**
 * A note's first non-empty line, used as the card heading. Notes have no title
 * column — the opening line is the title by convention.
 */
export function noteHeadline(body: string): string {
  return body.split("\n").find((line) => line.trim() !== "")?.trim() ?? "";
}
