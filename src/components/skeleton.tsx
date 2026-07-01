export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[4px] border ${className}`}
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    />
  );
}
