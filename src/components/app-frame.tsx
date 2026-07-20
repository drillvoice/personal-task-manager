"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps every authenticated page in a max-width container. Tasks, Projects,
 * Meetings, Review, and Today use the wider desktop surface needed for dense
 * lists, table/editing controls, the task picker, and two-column notes +
 * tasks layouts.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide =
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/meetings") ||
    pathname.startsWith("/people") ||
    pathname.startsWith("/today") ||
    pathname.startsWith("/review");
  // Tasks and People both carry a reserved detail-panel column, so they get
  // extra width beyond the standard wide surface.
  const hasDetailPanel =
    pathname.startsWith("/tasks") || pathname.startsWith("/people");
  const maxWidth = hasDetailPanel ? 1280 : isWide ? 900 : 420;
  return (
    <div
      className="mx-auto flex min-h-screen w-full flex-col"
      style={{
        maxWidth,
        transition: "max-width 0.15s",
      }}
    >
      {children}
    </div>
  );
}
