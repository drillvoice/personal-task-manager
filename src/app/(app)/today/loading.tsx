import { Skeleton } from "@/components/skeleton";

export default function TodayLoading() {
  return (
    <div className="p-4">
      <header className="mb-6">
        <Skeleton className="mb-2 h-[14px] w-40" />
        <Skeleton className="h-6 w-48" />
      </header>
      <div className="mb-4 flex flex-col gap-2">
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-[52px] w-full" />
      </div>
      <Skeleton className="mb-2 h-[14px] w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
