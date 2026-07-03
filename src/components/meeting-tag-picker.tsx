"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Tag } from "lucide-react";
import { createTag, setMeetingTags } from "@/app/(app)/meetings/actions";
import { TagChip } from "@/components/tag-chip";
import type { TagOption } from "@/lib/server/meetings";

export function MeetingTagPicker({
  meetingId,
  availableTags,
  initialTagIds,
}: {
  meetingId: string;
  availableTags: TagOption[];
  initialTagIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [extraTags, setExtraTags] = useState<TagOption[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = [
    ...availableTags,
    ...extraTags.filter((t) => !availableTags.some((a) => a.id === t.id)),
  ];
  const selected = allTags.filter((t) => selectedIds.includes(t.id));

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const commit = (ids: string[]) => {
    setSelectedIds(ids);
    startTransition(async () => {
      await setMeetingTags({ id: meetingId, tagIds: ids });
    });
  };

  const toggle = (id: string) => {
    commit(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  };

  const submitNew = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createTag({ name: newName.trim() });
      if (res.ok) {
        setExtraTags((prev) =>
          prev.some((t) => t.id === res.id)
            ? prev
            : [...prev, { id: res.id, name: res.name, color: res.color }],
        );
        const next = selectedIds.includes(res.id)
          ? selectedIds
          : [...selectedIds, res.id];
        setSelectedIds(next);
        await setMeetingTags({ id: meetingId, tagIds: next });
        setNewName("");
        setCreating(false);
        setOpen(true);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((t) => (
        <TagChip key={t.id} color={t.color}>
          {t.name}
        </TagChip>
      ))}
      <div className="relative">
        {creating ? (
          <div className="flex gap-1">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name…"
              className="w-[140px] border p-1 text-[12px] outline-none"
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
              className="font-mono shrink-0 border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                borderColor: "var(--color-ink)",
                background: "var(--color-ink)",
                color: "var(--color-paper)",
                opacity: pending || !newName.trim() ? 0.5 : 1,
              }}
            >
              Create
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="font-mono flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              borderColor: "var(--color-line)",
              color: "var(--color-ink-soft)",
            }}
          >
            <Tag size={10} />
            {selected.length > 0 ? "Edit tags" : "Add tags"}
            <ChevronDown size={10} />
          </button>
        )}

        {open && !creating && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div
              className="gtd-scrollbar absolute top-full left-0 z-30 mt-0.5 max-h-[280px] w-[200px] overflow-y-auto rounded-[4px] border"
              style={{
                background: "var(--color-paper-raised)",
                borderColor: "var(--color-line)",
              }}
            >
              {allTags.map((t) => {
                const on = selectedIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--color-paper)]"
                    style={{
                      color: on ? "var(--color-ink)" : "var(--color-ink-soft)",
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: t.color }}
                      />
                      {t.name}
                    </span>
                    {on && <span className="font-mono text-[10px]">✓</span>}
                  </button>
                );
              })}
              {allTags.length === 0 && (
                <p
                  className="font-mono px-3 py-2 text-[11px]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  No tags yet.
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
                + New tag…
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
