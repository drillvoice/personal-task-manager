"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isBareTagName } from "@/lib/journal-tags";
import type { JournalAutosave } from "@/components/use-journal-autosave";
import type { ContactOption } from "@/lib/server/people";
import type { TagOption } from "@/lib/server/meetings";

const INDENT = "  ";
const MAX_MENU_ITEMS = 8;

type MenuItem =
  | { kind: "person"; id: string; name: string }
  | { kind: "tag"; id: string; name: string; color: string }
  | { kind: "create-tag"; name: string };

type Menu = { trigger: "@" | "#"; tokenStart: number; query: string };

export function JournalEditor({
  autosave,
  people,
  tags,
}: {
  autosave: JournalAutosave;
  people: ContactOption[];
  tags: TagOption[];
}) {
  const { value, setValue, createdTagNames, error, pending, dirty } = autosave;
  const [menu, setMenu] = useState<Menu | null>(null);
  const [active, setActive] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // Apply a caret position queued by an edit that also changed `value`, once
  // React has painted the new text.
  useEffect(() => {
    if (pendingCaret.current === null) return;
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [value]);

  const items = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const q = menu.query.toLowerCase();
    if (menu.trigger === "@") {
      return people
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, MAX_MENU_ITEMS)
        .map((p) => ({ kind: "person", id: p.id, name: p.name }));
    }
    const matches = tags.filter((t) => t.name.toLowerCase().includes(q));
    const known = [...tags.map((t) => t.name), ...createdTagNames];
    const exact = known.some((name) => name.toLowerCase() === q);
    const list: MenuItem[] = matches
      .slice(0, MAX_MENU_ITEMS)
      .map((t) => ({ kind: "tag", id: t.id, name: t.name, color: t.color }));
    if (menu.query.length > 0 && !exact && isBareTagName(menu.query)) {
      list.push({ kind: "create-tag", name: menu.query });
    }
    return list;
  }, [menu, people, tags, createdTagNames]);

  const closeMenu = () => setMenu(null);

  // Recompute the mention/tag menu from the text immediately left of the caret.
  const syncMenu = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(/(^|\s)([@#])([^\s]*)$/);
    if (!m) {
      closeMenu();
      return;
    }
    const trigger = m[2] as "@" | "#";
    const query = m[3];
    setMenu({ trigger, tokenStart: caret - query.length - 1, query });
    setActive(0);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    syncMenu(next, e.target.selectionStart ?? next.length);
  };

  // React's onSelect does not fire for a caret move with no selection, so the
  // menu could outlive the token it was opened for. selectionchange covers
  // arrow keys, Home/End, and clicks alike. Text is read off the element
  // because the event can beat React's re-render to it.
  useEffect(() => {
    const onSelectionChange = () => {
      const el = textareaRef.current;
      if (!el || document.activeElement !== el) return;
      syncMenu(el.value, el.selectionStart ?? el.value.length);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
    // syncMenu only touches state setters, which are stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySelection = (item: MenuItem) => {
    if (!menu) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    // Never act on a token the caret has already left — replacing that span
    // would splice the mention into unrelated text.
    if (value.slice(menu.tokenStart, caret) !== menu.trigger + menu.query) {
      closeMenu();
      return;
    }
    const before = value.slice(0, menu.tokenStart);
    const after = value.slice(caret);
    if (item.kind === "create-tag") {
      autosave.registerTagCreate(item.name);
    }
    const insert =
      item.kind === "person"
        ? `[@${item.name}](/people/${item.id}) `
        : item.kind === "tag"
          ? `[#${item.name}](/tags/${item.id}) `
          : `#${item.name} `;
    const next = before + insert + after;
    pendingCaret.current = (before + insert).length;
    setValue(next);
    closeMenu();
  };

  // Indent / outdent the selected line range (or insert an indent at the caret).
  const handleTab = (outdent: boolean) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const multiline = value.slice(start, end).includes("\n");

    if (!multiline && !outdent) {
      const next = value.slice(0, start) + INDENT + value.slice(end);
      pendingCaret.current = start + INDENT.length;
      setValue(next);
      return;
    }

    const block = value.slice(lineStart, end);
    const lines = block.split("\n");
    let removedFirst = 0;
    let removedTotal = 0;
    const transformed = lines
      .map((line, i) => {
        if (outdent) {
          const trimmed = line.replace(/^ {1,2}/, "");
          const removed = line.length - trimmed.length;
          if (i === 0) removedFirst = removed;
          removedTotal += removed;
          return trimmed;
        }
        if (i === 0) removedFirst = -INDENT.length;
        removedTotal -= INDENT.length;
        return INDENT + line;
      })
      .join("\n");
    const next = value.slice(0, lineStart) + transformed + value.slice(end);
    setValue(next);
    pendingCaret.current = Math.max(lineStart, start - removedFirst);
    // Selection collapses to caret after a programmatic edit; keeping the
    // caret sensible is enough for the outline-indent use case.
    void removedTotal;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + items.length) % items.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySelection(items[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      handleTab(e.shiftKey);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={autosave.flush}
        placeholder="Jot what happened today. Type @ for a person, # for a tag."
        rows={18}
        className="gtd-scrollbar w-full resize-y rounded-[4px] border p-3 text-[13px] leading-relaxed outline-none"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-mono)",
        }}
      />

      {menu && items.length > 0 && (
        <ul
          className="gtd-scrollbar absolute top-full left-2 z-30 mt-1 max-h-56 w-64 overflow-y-auto rounded-[4px] border py-1 shadow-lg"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          {items.map((item, i) => (
            <li key={`${item.kind}-${item.name}-${i}`}>
              <button
                type="button"
                // mousedown (not click) so selecting doesn't blur the textarea
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySelection(item);
                }}
                onMouseEnter={() => setActive(i)}
                className="font-mono flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]"
                style={{
                  background:
                    i === active ? "var(--color-accent-soft)" : "transparent",
                  color: "var(--color-ink)",
                }}
              >
                {item.kind === "create-tag" ? (
                  <span style={{ color: "var(--color-ink-soft)" }}>
                    Create <span style={{ color: "var(--color-ink)" }}>#{item.name}</span>
                  </span>
                ) : item.kind === "tag" ? (
                  <span style={{ color: item.color }}>#{item.name}</span>
                ) : (
                  <span>@{item.name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        className="font-mono mt-1 text-right text-[10px]"
        style={{
          color: error ? "var(--color-danger)" : "var(--color-ink-soft)",
          visibility: pending || dirty || error ? "visible" : "hidden",
        }}
      >
        {pending
          ? "Saving…"
          : error
            ? `Not saved — ${error}`
            : "Unsaved changes"}
      </p>
    </div>
  );
}
