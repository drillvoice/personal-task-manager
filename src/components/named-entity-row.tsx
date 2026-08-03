"use client";

import { useState, useTransition } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { inputStyle } from "@/components/field-style";
import type { OrganisationRow } from "@/lib/server/people";

/**
 * A name-plus-notes row that expands into an inline editor. Organisations and
 * groups are the same row with different labels — a group additionally shows a
 * member count when collapsed and a member picker when open, which is what
 * `subtitle` and `extraFields` are for.
 */
export function NamedEntityRow({
  entity,
  deleteLabel,
  subtitle,
  extraFields,
  onSave,
  onDelete,
}: {
  entity: OrganisationRow;
  deleteLabel: string;
  subtitle?: React.ReactNode;
  extraFields?: React.ReactNode;
  onSave: (fields: {
    name: string;
    notes: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entity.name);
  const [notes, setNotes] = useState(entity.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await onSave({ name, notes });
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  };

  const del = () => {
    startTransition(async () => {
      await onDelete();
    });
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer border-b px-1 py-2.5"
        style={{ borderColor: "var(--color-line)" }}
        onClick={() => setEditing(true)}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-[14px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {entity.name}
          </span>
          {subtitle && (
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {subtitle}
            </span>
          )}
        </div>
        {entity.notes && (
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {entity.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="border-b px-1 py-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      {extraFields && <div className="mb-2">{extraFields}</div>}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none"
        style={inputStyle}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <ConfirmDeleteButton
          label={deleteLabel}
          pending={pending}
          onConfirm={del}
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="font-mono px-3 py-1.5 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              opacity: pending || !name.trim() ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
