"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { createPerson } from "@/app/(app)/people/actions";
import type { ContactOption } from "@/lib/server/people";

export function AttendeePicker({
  people,
  selectedIds,
  onChange,
}: {
  people: ContactOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [extraPeople, setExtraPeople] = useState<ContactOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // After inline creation the person can arrive via props too (createPerson
  // revalidates and re-renders the server component), so drop optimistic
  // entries the server already knows about.
  const allPeople = [
    ...people,
    ...extraPeople.filter((e) => !people.some((p) => p.id === e.id)),
  ];
  const selected = allPeople.filter((p) => selectedIds.includes(p.id));
  const label =
    selected.length > 0
      ? selected.map((p) => p.name).join(", ")
      : "No attendees";

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  };

  const submitNew = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createPerson({ name: newName.trim() });
      if (res.ok) {
        setExtraPeople((prev) => [
          ...prev,
          { id: res.id, name: newName.trim() },
        ]);
        onChange([...selectedIds, res.id]);
        setNewName("");
        setCreating(false);
        setOpen(true);
      }
    });
  };

  if (creating) {
    return (
      <div className="flex gap-1">
        <input
          ref={inputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Person's name…"
          className="min-w-0 flex-1 border p-2 text-[13px] outline-none"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submitNew(); }
            if (e.key === "Escape") { setCreating(false); setNewName(""); }
          }}
        />
        <button
          type="button"
          onClick={submitNew}
          disabled={pending || !newName.trim()}
          className="font-mono shrink-0 border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            borderColor: "var(--color-ink)",
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: pending || !newName.trim() ? 0.5 : 1,
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => { setCreating(false); setNewName(""); }}
          className="font-mono shrink-0 border px-2 py-1 text-[12px]"
          style={{
            borderColor: "var(--color-line)",
            color: "var(--color-ink-soft)",
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border p-2 text-[13px]"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: selected.length > 0 ? "var(--color-ink)" : "var(--color-ink-soft)",
          textAlign: "left",
        }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Users
            size={13}
            style={{ color: "var(--color-ink-soft)", flexShrink: 0 }}
          />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          size={13}
          style={{ color: "var(--color-ink-soft)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="gtd-scrollbar absolute top-full right-0 left-0 z-30 mt-0.5 max-h-[320px] overflow-y-auto rounded-[4px] border"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
          >
            {allPeople.map((p) => {
              const on = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
                  style={{
                    color: on ? "var(--color-ink)" : "var(--color-ink-soft)",
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {p.name}
                  {on && <Check size={13} style={{ color: "var(--color-teal)" }} />}
                </button>
              );
            })}
            {allPeople.length === 0 && (
              <p
                className="font-mono px-3 py-2 text-[11px]"
                style={{ color: "var(--color-ink-soft)" }}
              >
                No people yet.
              </p>
            )}
            <div
              className="border-t"
              style={{ borderColor: "var(--color-line)" }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="font-mono block w-full px-3 py-2 text-left text-[11px] font-semibold hover:bg-[var(--color-paper)]"
              style={{ color: "var(--color-accent)" }}
            >
              + New person…
            </button>
          </div>
        </>
      )}
    </div>
  );
}
