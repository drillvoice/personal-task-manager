"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AutosaveTextarea } from "@/components/autosave-textarea";
import { NoteBody } from "@/components/note-body";
import { deleteNote, updateNoteBody } from "@/app/(app)/notes/actions";
import { shortDateLabel } from "@/lib/time";
import type { NoteRow } from "@/lib/server/notes";

export function NoteCard({
  note,
  onTagClick,
}: {
  note: NoteRow;
  onTagClick: (name: string) => void;
}) {
  const [body, setBody] = useState(note.body);
  const [editing, setEditing] = useState(false);
  // Once opened, the editor stays mounted (hidden when collapsed) so a save
  // still in flight — or one that failed — keeps its state. Unmounting it on
  // collapse is how the journal editor once made a failed save look saved.
  const [everEdited, setEverEdited] = useState(false);
  const [removing, startRemoving] = useTransition();

  const remove = () => {
    if (!confirm("Delete this note?")) return;
    startRemoving(async () => {
      await deleteNote({ id: note.id });
    });
  };

  return (
    <li
      className="rounded-[4px] border p-3"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
        opacity: removing ? 0.5 : 1,
      }}
    >
      <div className={editing ? "hidden" : undefined}>
        <NoteBody body={body} onTagClick={onTagClick} />
      </div>

      {everEdited && (
        <div className={editing ? undefined : "hidden"}>
          <AutosaveTextarea
            initialValue={note.body}
            onValueChange={setBody}
            onSave={(value) => updateNoteBody({ id: note.id, body: value })}
            rows={4}
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <p
          className="font-mono text-[10px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {shortDateLabel(note.updatedAt)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEverEdited(true);
              setEditing((open) => !open);
            }}
            title={editing ? "Done editing" : "Edit note"}
            className="font-mono text-[10px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {editing ? (
              "Done"
            ) : (
              <Pencil size={13} color="var(--color-ink-soft)" />
            )}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            title="Delete note"
          >
            <Trash2 size={13} color="var(--color-danger)" />
          </button>
        </div>
      </div>
    </li>
  );
}
