import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewDetailActions } from "@/components/review-detail-actions";
import { loadReviewDetail } from "@/lib/server/review";
import { requireUserId } from "@/lib/server/session";
import { shortDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const review = await loadReviewDetail(userId, id);
  if (!review) notFound();

  return (
    <div className="p-4 pb-24">
      <header className="mb-4">
        <Link
          href="/review/history"
          className="font-mono text-[11px] text-accent"
        >
          ← review history
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">
              {review.weekLabel}
            </h1>
            <p
              className="font-mono text-[11px] text-ink-soft"
            >
              {review.completedAt
                ? `completed ${shortDateLabel(review.completedAt)}`
                : "in progress"}
            </p>
          </div>
          <ReviewDetailActions
            reviewId={review.id}
            completed={review.completedAt !== null}
          />
        </div>
      </header>

      <section className="mb-4">
        <h2
          className="font-mono mb-2 text-[11px] font-semibold text-accent"
        >
          WEEKLY PRIORITIES
        </h2>
        {review.priorities.length === 0 ? (
          <p
            className="font-mono text-[12px] text-ink-soft"
          >
            None set.
          </p>
        ) : (
          <ul
            className="rounded-card border p-3 bg-paper-raised border-line"
          >
            {review.priorities.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-2 py-0.5 text-[13px]"
              >
                <span
                  className="font-mono text-[11px]"
                  style={{
                    color: p.done
                      ? "var(--color-teal)"
                      : "var(--color-ink-soft)",
                  }}
                >
                  {p.done ? "✓" : "○"}
                </span>
                <span
                  style={{
                    color: p.done
                      ? "var(--color-ink-soft)"
                      : "var(--color-ink)",
                  }}
                >
                  {p.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <h2
          className="font-mono mb-2 text-[11px] font-semibold text-accent"
        >
          PROJECT NOTES
        </h2>
        {review.projectNotes.length === 0 ? (
          <p
            className="font-mono text-[12px] text-ink-soft"
          >
            No project notes for this week.
          </p>
        ) : (
          <div className="space-y-3">
            {review.projectNotes.map((p, i) => (
              <div
                key={i}
                className="rounded-card border p-3 bg-paper-raised border-line"
              >
                <h3 className="font-display mb-1 text-[14px] font-semibold">
                  {p.name}
                </h3>
                <p
                  className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink"
                >
                  {p.note}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2
          className="font-mono mb-2 text-[11px] font-semibold text-accent"
        >
          REFLECTION
        </h2>
        {review.reflectionNotes.trim() ? (
          <p
            className="rounded-card border p-3 text-[13px] leading-relaxed whitespace-pre-wrap bg-paper-raised border-line text-ink"
          >
            {review.reflectionNotes}
          </p>
        ) : (
          <p
            className="font-mono text-[12px] text-ink-soft"
          >
            No reflection written.
          </p>
        )}
      </section>
    </div>
  );
}
