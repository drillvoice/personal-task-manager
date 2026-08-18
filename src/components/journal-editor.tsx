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
  // Whether the user has actually reached into the menu (arrow keys, hover)
  // rather than merely having it appear while typing.
  const [engaged, setEngaged] = useState(false);
  const dismissed = useRef<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  // The editor is reached via keyboard shortcut (g 7) with no mouse
  // involved, so it needs to be usable without ever touching the mouse —
  // land focus in the textarea with the caret at the end of today's entry.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
    // Mount-only: this should fire once when the editor appears, not on
    // every keystroke that changes value.
  }, []);

  // Apply a selection queued by an edit that also changed `value`, once React
  // has painted the new text.
  useEffect(() => {
    const sel = pendingSelection.current;
    if (!sel) return;
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(sel.start, sel.end);
    }
    pendingSelection.current = null;
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

  const tokenKey = (m: Menu) => `${m.tokenStart}:${m.trigger}${m.query}`;

  // Recompute the mention/tag menu from the text immediately left of the caret.
  const syncMenu = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(/(^|\s)([@#])([^\s]*)$/);
    if (!m) {
      closeMenu();
      return;
    }
    const query = m[3];
    const next: Menu = {
      trigger: m[2] as "@" | "#",
      tokenStart: caret - query.length - 1,
      query,
    };
    // Escape dismisses the menu for this exact token, so it doesn't spring
    // back on the very next keystroke.
    if (dismissed.current === tokenKey(next)) return;
    dismissed.current = null;
    setMenu(next);
    setActive(0);
    setEngaged(false);
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
    const nextCaret = (before + insert).length;
    pendingSelection.current = { start: nextCaret, end: nextCaret };
    setValue(before + insert + after);
    closeMenu();
  };

  // Indent / outdent the selected line range (or insert an indent at the caret).
  const handleTab = (outdent: boolean) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;

    // Only a bare caret inserts an indent in place. With anything selected we
    // fall through and shift whole lines, because replacing the range would
    // delete the selected text.
    if (start === end && !outdent) {
      const caret = start + INDENT.length;
      pendingSelection.current = { start: caret, end: caret };
      setValue(value.slice(0, start) + INDENT + value.slice(end));
      return;
    }

    const lines = value.slice(lineStart, end).split("\n");
    let firstDelta = 0;
    let totalDelta = 0;
    const transformed = lines
      .map((line, i) => {
        if (outdent) {
          const trimmed = line.replace(/^ {1,2}/, "");
          const delta = trimmed.length - line.length;
          if (i === 0) firstDelta = delta;
          totalDelta += delta;
          return trimmed;
        }
        if (i === 0) firstDelta = INDENT.length;
        totalDelta += INDENT.length;
        return INDENT + line;
      })
      .join("\n");

    // Keep the selection across the edit so Shift-Tab can be pressed twice.
    pendingSelection.current = {
      start: Math.max(lineStart, start + firstDelta),
      end: Math.max(lineStart, end + totalDelta),
    };
    setValue(value.slice(0, lineStart) + transformed + value.slice(end));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEngaged(true);
        setActive((a) => (a + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEngaged(true);
        setActive((a) => (a - 1 + items.length) % items.length);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        dismissed.current = tokenKey(menu);
        closeMenu();
        return;
      }
      // A half-typed "@name" is inert until it becomes a link, so Enter taking
      // the top match is what the user wants. A bare "#tag" already links to an
      // existing tag on its own, so Enter there is far more likely to be "end
      // this line" — and minting a tag should be deliberate anyway. So "#"
      // commits only once the user has reached into the menu.
      if ((e.key === "Enter" || e.key === "Tab") && items[active]) {
        if (menu.trigger === "@" || engaged) {
          e.preventDefault();
          applySelection(items[active]);
          return;
        }
        closeMenu();
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
        className="gtd-scrollbar w-full resize-y rounded-card border p-3 text-[13px] leading-relaxed outline-none bg-paper-raised border-line text-ink"
        style={{ fontFamily: "var(--font-mono)" }}
      />

      {menu && items.length > 0 && (
        <ul
          className="gtd-scrollbar absolute top-full left-2 z-30 mt-1 max-h-56 w-64 overflow-y-auto rounded-card border py-1 shadow-lg bg-paper-raised border-line"
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
                onMouseEnter={() => {
                  setEngaged(true);
                  setActive(i);
                }}
                className="font-mono flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink"
                style={{ background:
                    i === active ? "var(--color-accent-soft)" : "transparent" }}
              >
                {item.kind === "create-tag" ? (
                  <span className="text-ink-soft">
                    Create <span className="text-ink">#{item.name}</span>
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
