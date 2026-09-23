import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
     * Keep visited pages in the client router cache for 30s, so switching
     * back to a tab you just left renders instantly instead of re-running the
     * page's queries. Every server action that writes calls revalidatePath,
     * which purges this cache, so a mutation is never followed by a stale page.
     * The exception is autosave targets, which skip revalidation on purpose;
     * their fields open on the last saved text via the saved-draft registry
     * in src/components/use-autosave.ts. A new autosave field must go through
     * useAutosave / useSavedDraft or it will reopen on stale text here.
     */
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
