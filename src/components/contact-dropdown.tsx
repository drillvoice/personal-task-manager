"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Users } from "lucide-react";
import { createPerson } from "@/app/(app)/people/actions";
import type { ContactOption } from "@/lib/server/people";

export type ContactSelection =
  | { type: "person"; id: string }
  | { type: "org"; id: string }
  | { type: "none" };

export function ContactDropdown({
  people,
  orgs,
  personId,
  orgId,
  onChange,
}: {
  people: ContactOption[];
  orgs: ContactOption[];
  personId: string;
  orgId: string;
  onChange: (selection: ContactSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [extraPeople, setExtraPeople] = useState<ContactOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allPeople = [...people, ...extraPeople];
  const selectedPerson = allPeople.find((p) => p.id === personId);
  const selectedOrg = orgs.find((o) => o.id === orgId);
  const label = selectedPerson?.name ?? selectedOrg?.name ?? "No contact";
  const hasSelection = Boolean(selectedPerson || selectedOrg);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const pick = (selection: ContactSelection) => {
    onChange(selection);
    setOpen(false);
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
        onChange({ type: "person", id: res.id });
        setNewName("");
        setCreating(false);
      }
    });
  };

  const sectionHeading = (text: string) => (
    <p
      className="font-mono px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide uppercase"
      style={{ color: "var(--color-ink-soft)" }}
    >
      {text}
    </p>
  );

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
          color: hasSelection ? "var(--color-ink)" : "var(--color-ink-soft)",
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
            <button
              type="button"
              onClick={() => pick({ type: "none" })}
              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
              style={{
                color: hasSelection
                  ? "var(--color-ink-soft)"
                  : "var(--color-ink)",
                fontWeight: hasSelection ? 400 : 600,
              }}
            >
              No contact
            </button>
            {allPeople.length > 0 && (
              <>
                {sectionHeading("People")}
                {allPeople.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick({ type: "person", id: p.id })}
                    className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
                    style={{
                      color:
                        p.id === personId
                          ? "var(--color-ink)"
                          : "var(--color-ink-soft)",
                      fontWeight: p.id === personId ? 600 : 400,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </>
            )}
            {orgs.length > 0 && (
              <>
                {sectionHeading("Organisations")}
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => pick({ type: "org", id: o.id })}
                    className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
                    style={{
                      color:
                        o.id === orgId
                          ? "var(--color-ink)"
                          : "var(--color-ink-soft)",
                      fontWeight: o.id === orgId ? 600 : 400,
                    }}
                  >
                    {o.name}
                  </button>
                ))}
              </>
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
