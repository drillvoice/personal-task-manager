export function TagChip({
  children,
  tone = "teal",
  color,
}: {
  children: React.ReactNode;
  tone?: "teal" | "accent";
  color?: string;
}) {
  const style = color
    ? { background: `${color}22`, color }
    : tone === "teal"
      ? { background: "var(--color-teal-soft)", color: "var(--color-teal)" }
      : { background: "var(--color-accent-soft)", color: "var(--color-accent)" };
  return (
    <span
      className="font-mono rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={style}
    >
      {children}
    </span>
  );
}
