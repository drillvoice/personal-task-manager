import { Skeleton } from "@/components/skeleton";

export default function JournalLoading() {
  return (
    <div className="p-4">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="mb-2 h-[14px] w-16" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-8 w-40" />
      </header>
      <Skeleton className="mb-2 h-7 w-24" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
