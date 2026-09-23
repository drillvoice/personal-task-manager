import { describe, expect, it } from "vitest";
import { recordDraft, resolveDraft } from "./use-autosave";

describe("resolveDraft", () => {
  it("uses the server value when nothing was saved", () => {
    expect(resolveDraft("k:none", "server")).toEqual({
      base: "server",
      text: "server",
    });
  });

  it("prefers the saved text over a payload that predates it", () => {
    recordDraft("k:stale", "old", "new");
    expect(resolveDraft("k:stale", "old")).toEqual({ base: "old", text: "new" });
    // Still stale on a second remount — the entry survives until the server
    // catches up.
    expect(resolveDraft("k:stale", "old").text).toBe("new");
  });

  it("drops the entry once the server has caught up", () => {
    recordDraft("k:fresh", "old", "new");
    expect(resolveDraft("k:fresh", "new")).toEqual({ base: "new", text: "new" });
    // Entry gone: a later payload is taken as-is.
    expect(resolveDraft("k:fresh", "old").text).toBe("old");
  });

  it("lets a change made elsewhere win over the local save", () => {
    recordDraft("k:elsewhere", "old", "mine");
    expect(resolveDraft("k:elsewhere", "theirs").text).toBe("theirs");
  });
});
