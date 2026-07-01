"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Grid3x3, ListTodo, RefreshCw } from "lucide-react";

const items = [
  { href: "/today", label: "Today", Icon: Circle },
  { href: "/tasks", label: "Tasks", Icon: ListTodo },
  { href: "/projects", label: "Projects", Icon: Grid3x3 },
  { href: "/review", label: "Review", Icon: RefreshCw },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 left-0 right-0 flex items-center justify-around border-t py-3"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1"
            aria-current={active ? "page" : undefined}
          >
            <Icon
              size={18}
              strokeWidth={active ? 2.5 : 1.8}
              color={active ? "var(--color-accent)" : "var(--color-ink-soft)"}
            />
            <span
              className="font-mono text-[10px] font-medium"
              style={{
                color: active ? "var(--color-accent)" : "var(--color-ink-soft)",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
