"use client";

import { useState, useTransition } from "react";
import { createNote } from "@/app/(app)/notes/actions";

export function NoteComposer() {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const result = await createNote({ body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setBody("");
    });
  };

  return (
    <div className="mb-5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Something worth remembering… use #tags to find it later"
        rows={2}
        className="gtd-scrollbar w-full resize-y rounded-card border p-3 text-[13px] leading-relaxed outline-none bg-paper-raised border-line text-ink"
      />
      <div className="mt-1 flex items-center justify-end gap-3">
        {error && (
          <p
            className="font-mono text-[10px] text-danger"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || pending}
          className="font-mono rounded-card px-3 py-1.5 text-[11px] disabled:opacity-40 bg-accent-soft text-accent"
        >
          {pending ? "Filing…" : "File note"}
        </button>
      </div>
    </div>
  );
}
