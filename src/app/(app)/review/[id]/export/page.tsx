import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { loadReviewDetail } from "@/lib/server/review";
import { requireUserId } from "@/lib/server/session";
import { shortDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReviewExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const review = await loadReviewDetail(userId, id);
  if (!review) notFound();

  return (
    <div className="mx-auto max-w-[720px] p-6 print:p-0">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link
          href={`/review/${review.id}`}
          className="font-mono text-[11px]"
          style={{ color: "var(--color-accent)" }}
        >
          ← back to review
        </Link>
        <PrintButton />
      </div>

      <article className="review-export text-[13px] leading-relaxed">
        <header className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
            Weekly review
          </p>
          <h1 className="font-display text-2xl font-bold">
            {review.weekLabel}
          </h1>
          {review.completedAt && (
            <p className="font-mono text-[11px] text-[color:var(--color-ink-soft)]">
              completed {shortDateLabel(review.completedAt)}
            </p>
          )}
        </header>

        <section className="mb-6">
          <h2 className="font-display mb-2 text-[15px] font-semibold">
            Priorities for the week
          </h2>
          {review.priorities.length === 0 ? (
            <p className="text-[color:var(--color-ink-soft)]">None set.</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              {review.priorities.map((p, i) => (
                <li key={i}>
                  {p.title}
                  {p.done && (
                    <span className="font-mono ml-2 text-[11px] text-[color:var(--color-teal)]">
                      done
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mb-6">
          <h2 className="font-display mb-2 text-[15px] font-semibold">
            Projects
          </h2>
          {review.projectNotes.length === 0 ? (
            <p className="text-[color:var(--color-ink-soft)]">
              No project notes for this week.
            </p>
          ) : (
            <div className="space-y-4">
              {review.projectNotes.map((p, i) => (
                <div key={i} className="break-inside-avoid">
                  <h3 className="font-display text-[14px] font-semibold">
                    {p.name}
                  </h3>
                  <p className="whitespace-pre-wrap">{p.note}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display mb-2 text-[15px] font-semibold">
            Reflection
          </h2>
          {review.reflectionNotes.trim() ? (
            <p className="whitespace-pre-wrap">{review.reflectionNotes}</p>
          ) : (
            <p className="text-[color:var(--color-ink-soft)]">
              No reflection written.
            </p>
          )}
        </section>
      </article>
    </div>
  );
}
