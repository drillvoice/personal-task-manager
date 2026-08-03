"use client";

import { useState } from "react";

/**
 * Two-step delete: the first click arms it, the second calls `onConfirm`, and
 * "Keep" backs out. Used instead of `window.confirm` so a destructive action
 * stays inside the app's own paper/ink language.
 */
export function ConfirmDeleteButton({
  label,
  confirmLabel = "Confirm delete?",
  pending = false,
  className,
  onConfirm,
}: {
  label: string;
  confirmLabel?: string;
  pending?: boolean;
  className?: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <span className={`flex items-center ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => (confirming ? onConfirm() : setConfirming(true))}
        disabled={pending}
        className="font-mono text-[11px]"
        style={{
          color: confirming ? "var(--color-danger)" : "var(--color-ink-soft)",
          fontWeight: confirming ? 600 : 400,
        }}
      >
        {confirming ? confirmLabel : label}
      </button>
      {confirming && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="font-mono ml-2 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Keep
        </button>
      )}
    </span>
  );
}
