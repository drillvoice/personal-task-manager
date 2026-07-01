"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps every authenticated page in a max-width container that matches the
 * mockup: 420px for mobile-first views (Today, Tasks, Review) and 900px for
 * the desktop-oriented Projects history table.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = pathname.startsWith("/projects");
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
