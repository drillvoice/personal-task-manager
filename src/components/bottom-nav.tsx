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

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50 border-b py-3"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-between px-5 sm:px-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-[48px] flex-col items-center gap-1 px-1"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 1.8}
                color={
                  active ? "var(--color-accent)" : "var(--color-ink-soft)"
                }
              />
              <span
                className="font-mono text-[10px] font-medium"
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
