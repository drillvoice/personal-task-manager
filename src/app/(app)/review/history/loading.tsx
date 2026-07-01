import { Skeleton } from "@/components/skeleton";

export default function ReviewHistoryLoading() {
  return (
    <div className="p-4 pb-24">
      <header className="mb-4">
        <Skeleton className="mb-2 h-6 w-44" />
        <Skeleton className="h-[14px] w-28" />
      </header>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
