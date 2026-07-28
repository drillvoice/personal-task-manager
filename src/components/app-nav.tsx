"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Circle,
  Grid3x3,
  ListTodo,
  NotebookPen,
  RefreshCw,
  Users,
} from "lucide-react";

const items = [
  { href: "/today", label: "Today", Icon: Circle },
  { href: "/tasks", label: "Tasks", Icon: ListTodo },
  { href: "/projects", label: "Projects", Icon: Grid3x3 },
  { href: "/meetings", label: "Meetings", Icon: CalendarDays },
  { href: "/people", label: "People", Icon: Users },
  { href: "/review", label: "Review", Icon: RefreshCw },
  { href: "/journal", label: "Journal", Icon: NotebookPen },
] as const;

// Desktop rail is icon-only by default and expands on hover. The content
// offset in the app layout is pinned to the collapsed width, so the expanded
// rail overlays the page rather than pushing it.
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_WIDTH = 208;

// Gmail-style sequence: pressing `g` arms navigation (revealing the number
// cues) and the next digit jumps to that view. Cmd/Ctrl+number is deliberately
// avoided — browsers reserve it for tab switching and swallow preventDefault.
const ARM_TIMEOUT_MS = 2000;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearArm = () => {
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = null;
      setArmed(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;

      if (armTimer.current) {
        const index = Number(e.key) - 1;
        if (index >= 0 && index < items.length) {
          e.preventDefault();
          router.push(items[index].href);
        }
        clearArm();
        return;
      }

      if (e.key === "g") {
        e.preventDefault();
        setArmed(true);
        armTimer.current = setTimeout(clearArm, ARM_TIMEOUT_MS);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, [router]);

  return (
    <nav
      className="group fixed top-0 right-0 left-0 z-50 border-b py-3 md:right-auto md:bottom-0 md:w-16 md:overflow-hidden md:border-r md:border-b-0 md:py-6 md:transition-[width] md:duration-150 md:ease-out md:hover:w-[208px] md:hover:shadow-lg print:hidden"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-between px-5 sm:px-4 md:max-w-none md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-3">
        {items.map(({ href, label, Icon }, i) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={`${label} (g ${i + 1})`}
              className="flex min-w-[48px] flex-col items-center gap-1 rounded-lg px-1 md:min-w-0 md:flex-row md:justify-center md:gap-3 md:px-3 md:py-2.5 md:group-hover:justify-start md:aria-[current=page]:bg-[var(--color-accent-soft)]"
              aria-current={active ? "page" : undefined}
            >
              <span className="relative shrink-0">
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={
                    active ? "var(--color-accent)" : "var(--color-ink-soft)"
                  }
                />
                {armed && (
                  <span
                    className="pointer-events-none absolute -top-2 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold"
                    style={{
                      background: "var(--color-accent)",
                      color: "var(--color-paper-raised)",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </span>
              <span
                className="font-mono text-[10px] font-medium md:hidden md:text-[13px] md:whitespace-nowrap md:group-hover:inline"
                style={{
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-ink-soft)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
