import type { ButtonHTMLAttributes } from "react";

/**
 * The three button shapes the app actually uses. Anything else — tag chips,
 * count badges, the danger and outline pills — stays hand-classed rather than
 * growing a variant with one caller.
 */
type Variant = "primary" | "quiet" | "accent";

const VARIANTS: Record<Variant, string> = {
  // Filled ink: the committing action in a form or panel footer.
  primary:
    "font-mono px-3 py-1.5 text-[12px] font-semibold bg-ink text-paper disabled:opacity-60",
  // Unfilled: the accompanying Cancel, which must not compete with it.
  quiet: "font-mono px-3 py-1.5 text-[12px] text-ink-soft disabled:opacity-60",
  // Accent pill: the "new thing" affordance in a view header.
  accent:
    "font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-accent text-paper-raised disabled:opacity-60",
};

export function Button({
  variant,
  className = "",
  type = "button",
  ...props
}: { variant: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={className ? `${VARIANTS[variant]} ${className}` : VARIANTS[variant]}
      {...props}
    />
  );
}
