"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { sendMagicLink } from "@/app/login/actions";

type Status = "idle" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await sendMagicLink(email);
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setError(res.error);
      }
    });
  };

  if (status === "sent") {
    return (
      <div
        className="w-full rounded-[4px] border p-6 text-center"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-teal)",
        }}
      >
        <div
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--color-teal)" }}
        >
          <Check size={20} color="var(--color-paper-raised)" strokeWidth={3} />
        </div>
        <p className="text-[14px] font-medium">Check your email.</p>
        <p
          className="font-mono mt-2 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Sent to <strong>{email}</strong>. Click the link to sign in — it
          expires in 24 hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
          className="font-mono mt-4 text-[11px] underline"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Wrong email? Try again.
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-2">
      <input
        name="email"
        type="email"
        required
        autoFocus
        disabled={pending}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full border p-3 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
      />
      <button
        type="submit"
        disabled={pending || !email.trim()}
        className="font-mono w-full px-3 py-3 text-[12px] font-semibold"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-paper)",
          opacity: pending || !email.trim() ? 0.6 : 1,
        }}
      >
        {pending ? "Sending magic link…" : "Send magic link"}
      </button>
      {status === "error" && error && (
        <p
          className="font-mono mt-1 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
