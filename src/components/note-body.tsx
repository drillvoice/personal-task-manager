"use client";

import { Fragment } from "react";
import { findBareTagMatches } from "@/lib/journal-tags";

/**
 * A note body as plain text, with bare "#tag" runs rendered as clickable chips.
 *
 * Not markdown: notes are one-liners, and the scan is shared with the journal
 * so the two modules agree on what counts as a tag (skipping url fragments,
 * heading markers, "#123" and code spans).
 */
export function NoteBody({
  body,
  onTagClick,
}: {
  body: string;
  onTagClick: (name: string) => void;
}) {
  const matches = findBareTagMatches(body);
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const { name, index, length } of matches) {
    if (index > cursor) segments.push(body.slice(cursor, index));
    segments.push(
      <button
        key={index}
        type="button"
        onClick={() => onTagClick(name)}
        title={`Search for #${name}`}
        className="font-mono mx-0.5 inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px]"
        style={{ color: "var(--color-teal)", borderColor: "var(--color-teal)" }}
      >
        #{name}
      </button>,
    );
    cursor = index + length;
  }
  segments.push(body.slice(cursor));

  return (
    <p
      className="text-[13px] leading-relaxed whitespace-pre-wrap"
      style={{ color: "var(--color-ink)" }}
    >
      {segments.map((segment, i) => (
        <Fragment key={i}>{segment}</Fragment>
      ))}
    </p>
  );
}
