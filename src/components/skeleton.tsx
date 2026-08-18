export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`card animate-pulse ${className}`} />
  );
}
