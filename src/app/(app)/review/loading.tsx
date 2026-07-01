import { Skeleton } from "@/components/skeleton";

export default function ReviewLoading() {
  return (
    <div className="p-4">
      <header className="mb-6">
        <Skeleton className="mb-2 h-[14px] w-40" />
        <Skeleton className="h-6 w-44" />
      </header>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
