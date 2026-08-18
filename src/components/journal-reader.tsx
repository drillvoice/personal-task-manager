import Link from "next/link";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkBareTags } from "@/lib/journal-tags";
import type { TagOption } from "@/lib/server/meetings";

export function JournalReader({
  body,
  tags,
}: {
  body: string;
  tags: TagOption[];
}) {
  if (!body.trim()) {
    return (
      <p
        className="font-mono rounded-card border p-3 text-[12px] bg-paper-raised border-line text-ink-soft"
      >
        Nothing logged for this day.
      </p>
    );
  }

  const colorByName = new Map(
    tags.map((t) => [t.name.toLowerCase(), t.color] as const),
  );
  const colorById = new Map(tags.map((t) => [t.id, t.color] as const));
  const withTagLinks = linkBareTags(body);

  return (
    <div className="journal-prose text-[13px] leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // Only our own "tag:" scheme bypasses the sanitiser. Journal text is
        // self-authored but not self-written — it is where things get pasted
        // from email and the web — and disabling the transform outright left
        // "javascript:" hrefs live.
        urlTransform={(url) =>
          url.startsWith("tag:") ? url : defaultUrlTransform(url)
        }
        components={{
          a({ href, children }) {
            const url = href ?? "";
            if (url.startsWith("/people/")) {
              return (
                <Link
                  href={url}
                  className="font-medium no-underline text-teal"
                >
                  {children}
                </Link>
              );
            }
            // Structured tag link "[#name](/tags/<id>)" — chip coloured by id,
            // label taken from the link text (children), so multi-word tags show
            // in full.
            if (url.startsWith("/tags/")) {
              const color =
                colorById.get(url.slice("/tags/".length)) ??
                "var(--color-teal)";
              return (
                <span
                  className="font-mono mx-0.5 inline-flex items-center rounded-card border px-1.5 py-0.5 text-[11px]"
                  style={{ color, borderColor: color }}
                >
                  {children}
                </span>
              );
            }
            // Bare "#word" tag (rewritten to a "tag:" scheme above).
            if (url.startsWith("tag:")) {
              const name = url.slice(4);
              const color =
                colorByName.get(name.toLowerCase()) ?? "var(--color-teal)";
              return (
                <span
                  className="font-mono mx-0.5 inline-flex items-center rounded-card border px-1.5 py-0.5 text-[11px]"
                  style={{ color, borderColor: color }}
                >
                  #{name}
                </span>
              );
            }
            return (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="underline text-accent"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {withTagLinks}
      </Markdown>
    </div>
  );
}
