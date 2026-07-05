"use client";

import { useState } from "react";

/** Shared transparent-bordered input styling for the inline edit forms. */
export const editInputStyle = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
} as const;

/**
 * The footer shared by every inline edit form (task / person / organisation):
 * an optional error line, a two-click "Delete → Confirm delete?" button, and
 * the Cancel/Save pair. Owns the confirm-delete state so that guard can't drift
 * between forms.
 */
export function EditFormActions({
  deleteLabel,
  onDelete,
  onCancel,
  onSave,
  canSave,
  pending,
  error,
}: {
  deleteLabel: string;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  canSave: boolean;
  pending: boolean;
  error?: string | null;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
  };

  return (
    <>
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={del}
          disabled={pending}
          className="font-mono text-[11px]"
          style={{
            color: confirmDelete
              ? "var(--color-danger)"
              : "var(--color-ink-soft)",
          }}
        >
          {confirmDelete ? "Confirm delete?" : deleteLabel}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-mono ml-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Keep
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-mono px-3 py-1.5 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !canSave}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              opacity: pending || !canSave ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
