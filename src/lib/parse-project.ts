export type ProjectOptionLike = { id: string; name: string };

// `projectOnly` marks a title that is nothing but a project reference
// ("^NSW") — there is no task to create yet, so callers prompt rather than
// stranding the user with "^NSW" as a task title.
export type ParsedProject = {
  title: string;
  projectId: string | null;
  projectOnly: boolean;
};

export const PROJECT_SIGIL = "^";

/**
 * Pulls a `^Project Name` token out of a quick-capture title and resolves it
 * to a project id — the project counterpart to the `#tag` syntax.
 *
 * Project names contain spaces, so there is no delimiter to parse against:
 * instead the known project names are tried against the text following the
 * sigil, longest first, so "^Housing Policy" wins over a "Housing" project.
 * A token that matches nothing is left in the title untouched and resolves to
 * Inbox — a typo must never silently swallow the capture.
 */
export function extractProject(
  rawTitle: string,
  projects: ProjectOptionLike[],
): ParsedProject {
  const byLength = [...projects].sort((a, b) => b.name.length - a.name.length);

  for (let i = 0; i < rawTitle.length; i++) {
    if (rawTitle[i] !== PROJECT_SIGIL) continue;
    const rest = rawTitle.slice(i + 1).toLowerCase();
    const match = byLength.find(
      (p) => p.name !== "" && rest.startsWith(p.name.toLowerCase()),
    );
    if (!match) continue;

    const title = (
      rawTitle.slice(0, i) + rawTitle.slice(i + 1 + match.name.length)
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!title) {
      return { title: rawTitle.trim(), projectId: match.id, projectOnly: true };
    }
    return { title, projectId: match.id, projectOnly: false };
  }

  return { title: rawTitle.trim(), projectId: null, projectOnly: false };
}

export type ProjectToken = { start: number; end: number; query: string };

/**
 * The `^…` token the caret currently sits in, for driving the inline
 * autocomplete. The query runs from the sigil to the caret and may contain
 * spaces (project names do); the caller closes the dropdown once nothing
 * matches, which is what keeps the rest of a sentence out of the token.
 */
export function activeProjectToken(
  value: string,
  caret: number,
): ProjectToken | null {
  const start = value.lastIndexOf(PROJECT_SIGIL, Math.max(caret - 1, 0));
  if (start === -1 || start >= caret) return null;
  return { start, end: caret, query: value.slice(start + 1, caret) };
}
