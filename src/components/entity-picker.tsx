"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

export type PickerOption = { id: string; name: string; color?: string };

export function EntityPicker({
  mode,
  options,
  selectedIds,
  onChange,
  onCreate,
  placeholder,
  icon: Icon,
}: {
  mode: "single" | "multi";
  options: PickerOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate?: (name: string) => Promise<PickerOption | null>;
  placeholder?: string;
  icon?: LucideIcon;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Newly created items may not appear in `options` until the next server
  // round-trip; keep them locally so their chips render immediately.
  const [extra, setExtra] = useState<PickerOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(() => {
    const merged = [...options];
    for (const e of extra) {
      if (!merged.some((o) => o.id === e.id)) merged.push(e);
    }
    return merged;
  }, [options, extra]);

  const selected = selectedIds
    .map((id) => allOptions.find((o) => o.id === id))
    .filter((o): o is PickerOption => Boolean(o));

  const q = query.trim().toLowerCase();
  const suggestions = allOptions.filter(
    (o) =>
      !selectedIds.includes(o.id) &&
      (q === "" || o.name.toLowerCase().includes(q)),
  );
  const exactMatch = allOptions.find((o) => o.name.toLowerCase() === q);
  const canCreate = Boolean(onCreate) && q !== "" && !exactMatch;

  const applySelection = (id: string) => {
    onChange(mode === "single" ? [id] : [...selectedIds, id]);
    setQuery("");
    setHighlight(0);
    if (mode === "single") setOpen(false);
    inputRef.current?.focus();
  };

  const create = () => {
    if (!onCreate) return;
    const name = query.trim();
    if (!name) return;
    startTransition(async () => {
      const created = await onCreate(name);
      if (created) {
        setExtra((prev) => [...prev, created]);
        applySelection(created.id);
      }
    });
  };

  const remove = (id: string) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    onChange(selectedIds.filter((s) => s !== id));
    setConfirmingId(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const hl = suggestions[highlight];
      if (hl) applySelection(hl.id);
      else if (exactMatch) applySelection(exactMatch.id);
      else if (canCreate) create();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Backspace" && query === "" && selectedIds.length > 0) {
      e.preventDefault();
      onChange(selectedIds.slice(0, -1));
      setConfirmingId(null);
    } else if (e.key === "Escape") {
      setOpen(false);
      setConfirmingId(null);
      setQuery("");
    }
  };

  const showDropdown = open && (suggestions.length > 0 || canCreate);
  const backdrop = showDropdown || confirmingId !== null;

  return (
    <div className="relative">
      {backdrop && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setOpen(false);
            setConfirmingId(null);
          }}
        />
      )}
      <div
        className="relative z-20 flex flex-wrap items-center gap-1.5 border p-2"
        style={{ background: "transparent", borderColor: "var(--color-line)" }}
        onClick={() => inputRef.current?.focus()}
      >
        {Icon && (
          <Icon
            size={13}
            style={{ color: "var(--color-ink-soft)", flexShrink: 0 }}
          />
        )}
        {selected.map((o) => {
          const confirming = confirmingId === o.id;
          const style = o.color
            ? { background: `${o.color}22`, color: o.color }
            : { background: "var(--color-teal-soft)", color: "var(--color-teal)" };
          return (
            <span
              key={o.id}
              className="font-mono inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={style}
            >
              {o.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(o.id);
                }}
                aria-label={
                  confirming ? `Confirm remove ${o.name}` : `Remove ${o.name}`
                }
                className="inline-flex items-center"
                style={{ color: confirming ? "var(--color-danger)" : "inherit" }}
              >
                {confirming ? (
                  <span className="text-[10px] font-semibold">remove?</span>
                ) : (
                  <X size={11} />
                )}
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: "var(--color-ink)" }}
        />
      </div>

      {showDropdown && (
        <div
          className="gtd-scrollbar absolute top-full right-0 left-0 z-30 mt-0.5 max-h-[280px] overflow-y-auto rounded-[4px] border"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((o, i) => (
            <button
              key={o.id}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => applySelection(o.id)}
              className="block w-full px-3 py-2 text-left text-[13px]"
              style={{
                background:
                  i === highlight ? "var(--color-paper)" : "transparent",
                color: "var(--color-ink)",
              }}
            >
              {o.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHighlight(suggestions.length)}
              onClick={create}
              disabled={pending}
              className="font-mono block w-full px-3 py-2 text-left text-[11px] font-semibold"
              style={{
                color: "var(--color-accent)",
                background:
                  highlight >= suggestions.length
                    ? "var(--color-paper)"
                    : "transparent",
              }}
            >
              + Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
