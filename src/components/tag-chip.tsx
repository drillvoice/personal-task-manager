export function TagChip({
  children,
  tone = "teal",
}: {
  children: React.ReactNode;
  tone?: "teal" | "accent";
}) {
  const style =
    tone === "teal"
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
