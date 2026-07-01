"use client";

import { useTransition } from "react";
import { signInWithGitHub } from "@/app/login/actions";

export function LoginForm({ error }: { error?: string | null }) {
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      await signInWithGitHub();
    });
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="font-mono w-full px-3 py-3 text-[13px] font-semibold"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-paper)",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Redirecting to GitHub…" : "Sign in with GitHub"}
      </button>
      {error && (
        <p
          className="font-mono text-center text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
