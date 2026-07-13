"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Circle,
  Grid3x3,
  ListTodo,
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
] as const;

// Desktop rail is icon-only by default and expands on hover. The content
// offset in the app layout is pinned to the collapsed width, so the expanded
// rail overlays the page rather than pushing it.
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_WIDTH = 208;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      className="group fixed top-0 right-0 left-0 z-50 border-b py-3 md:right-auto md:bottom-0 md:w-16 md:overflow-hidden md:border-r md:border-b-0 md:py-6 md:transition-[width] md:duration-150 md:ease-out md:hover:w-[208px] md:hover:shadow-lg print:hidden"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-between px-5 sm:px-4 md:max-w-none md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-3">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex min-w-[48px] flex-col items-center gap-1 rounded-lg px-1 md:min-w-0 md:flex-row md:justify-center md:gap-3 md:px-3 md:py-2.5 md:group-hover:justify-start md:aria-[current=page]:bg-[var(--color-accent-soft)]"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 1.8}
                color={active ? "var(--color-accent)" : "var(--color-ink-soft)"}
                className="shrink-0"
              />
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
