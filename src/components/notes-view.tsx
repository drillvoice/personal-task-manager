"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { NoteCard } from "@/components/note-card";
import { NoteComposer } from "@/components/note-composer";
import type { NoteRow } from "@/lib/server/notes";

// Long enough that a normal typing burst is one request, short enough that the
// list feels live.
const SEARCH_DEBOUNCE_MS = 250;

export function NotesView({
  notes,
  query,
}: {
  notes: NoteRow[];
  query: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The query lives in the URL so a search is linkable and survives reload.
  // scroll:false keeps the list from jumping to the top on every keystroke.
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      const next = search.trim() ? `/notes?q=${encodeURIComponent(search)}` : "/notes";
      router.replace(next, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query]);

  const searchFor = (name: string) => {
    setSearch(`#${name}`);
    inputRef.current?.focus();
  };

  return (
    <div className="p-4">
      <header className="mb-4">
        <p
          className="font-mono mb-1 text-[11px] tracking-wide uppercase text-ink-soft"
        >
          Filing cabinet
        </p>
        <h1
          className="font-display text-xl font-bold text-ink"
        >
          Notes
        </h1>
      </header>

      <NoteComposer />

      <div className="relative mb-5">
        <Search
          size={14}
          color="var(--color-ink-soft)"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="w-full rounded-card border py-2 pr-9 pl-9 text-[13px] outline-none bg-paper-raised border-line text-ink"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            title="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X size={14} color="var(--color-ink-soft)" />
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <p
          className="font-mono rounded-card border border-dashed p-6 text-center text-[12px] border-line text-ink-soft"
        >
          {query ? `No notes matching "${query}"` : "No notes yet"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onTagClick={searchFor} />
          ))}
        </ul>
      )}
    </div>
  );
}
