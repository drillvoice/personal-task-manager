import { Skeleton } from "@/components/skeleton";

export default function TasksLoading() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-4 h-9 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
