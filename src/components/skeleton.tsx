export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-card border ${className} bg-paper-raised border-line`}
    />
  );
}
