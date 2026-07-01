"use server";

import { signIn } from "@/lib/auth";

/**
 * Called from the client login form. We pass `redirect: false` so signIn
 * returns instead of throwing NEXT_REDIRECT — that lets the client show
 * an explicit "sent" state (or an error) rather than relying on Auth.js's
 * built-in redirect to /login?verify=1, which gave no in-progress feedback
 * during the send.
 */
export async function sendMagicLink(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required" };
  try {
    await signIn("resend", { email: trimmed, redirect: false });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to send magic link";
    return { ok: false, error: message };
  }
}
