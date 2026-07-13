"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteReview, reopenReview } from "@/app/(app)/review/actions";

export function ReviewDetailActions({
  reviewId,
  completed,
}: {
  reviewId: string;
  completed: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const edit = () => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to /review; only a blocked reopen
      // (another review still open) returns here with an error.
      const res = await reopenReview(reviewId);
      if (res && !res.ok) setError(res.error);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteReview(reviewId);
    });
  };

  return (
    <div className="border-t pt-4" style={{ borderColor: "var(--color-line)" }}>
      {error && (
        <p
          className="font-mono mb-3 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/review/${reviewId}/export`}
          className="font-mono rounded-full border px-4 py-2 text-[12px] font-semibold"
          style={{
            borderColor: "var(--color-ink)",
            color: "var(--color-ink)",
          }}
        >
          Export
        </Link>
        <button
          type="button"
          onClick={edit}
          disabled={pending}
          className="font-mono rounded-full border px-4 py-2 text-[12px] font-semibold"
          style={{
            borderColor: "var(--color-ink)",
            color: "var(--color-ink)",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {completed ? "Reopen to edit" : "Continue editing"}
        </button>

        {confirming ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="font-mono rounded-full px-4 py-2 text-[12px] font-semibold"
              style={{
                background: "var(--color-danger)",
                color: "var(--color-paper)",
                opacity: pending ? 0.6 : 1,
              }}
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="font-mono px-2 py-2 text-[12px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="font-mono rounded-full border px-4 py-2 text-[12px] font-semibold"
            style={{
              borderColor: "var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
