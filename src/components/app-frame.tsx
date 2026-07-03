"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps every authenticated page in a max-width container. Today and Review
 * stay close to the mobile-first mockup; Tasks, Projects, and Meetings use
 * the wider desktop surface needed for dense lists, table/editing controls,
 * and the two-column notes + tasks layout (Meetings is desktop-first).
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide =
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/meetings");
  return (
    <div
      className="mx-auto flex min-h-screen w-full flex-col"
      style={{
        maxWidth: isWide ? 900 : 420,
        transition: "max-width 0.15s",
      }}
    >
      {children}
    </div>
  );
}
