"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps every authenticated page in a max-width container. Today and Review
 * stay close to the mobile-first mockup; Tasks and Projects use the wider
 * desktop surface needed for dense lists and table/editing controls.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide =
    pathname.startsWith("/projects") || pathname.startsWith("/tasks");
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
