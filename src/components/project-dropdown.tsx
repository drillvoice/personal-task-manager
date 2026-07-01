"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { createProject } from "@/app/(app)/projects/actions";

export type ProjectOption = { id: string | null; name: string };

export function ProjectDropdown({
  projects,
  value,
  onChange,
}: {
  projects: ProjectOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [extraProjects, setExtraProjects] = useState<{ id: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = [
    ...projects,
    ...extraProjects.map((p) => ({ id: p.id, name: p.name })),
  ];
  const selected = all.find((p) => (p.id ?? "") === value);
  const label = selected?.name ?? "Inbox (no project)";

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const submitNew = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createProject({ name: newName.trim(), status: "active" });
      if (res.ok) {
        setExtraProjects((prev) => [...prev, { id: res.id, name: newName.trim() }]);
        onChange(res.id);
        setNewName("");
        setCreating(false);
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
          placeholder="Project name…"
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
        className="flex w-full items-center justify-between border p-2 text-[13px]"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: value === "" ? "var(--color-ink-soft)" : "var(--color-ink)",
          textAlign: "left",
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={13}
          style={{ color: "var(--color-ink-soft)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="gtd-scrollbar absolute top-full right-0 left-0 z-30 mt-0.5 max-h-[320px] overflow-y-auto rounded-[4px] border"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
          >
            {[{ id: null, name: "Inbox (no project)" }, ...all.filter((p) => p.id !== null)].map(
              (p) => (
                <button
                  key={p.id ?? "__inbox__"}
                  type="button"
                  onClick={() => {
                    onChange(p.id ?? "");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
                  style={{
                    color:
                      (p.id ?? "") === value
                        ? "var(--color-ink)"
                        : "var(--color-ink-soft)",
                    fontWeight: (p.id ?? "") === value ? 600 : 400,
                  }}
                >
                  {p.name}
                </button>
              ),
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
              + New project…
            </button>
          </div>
        </>
      )}
    </div>
  );
}
