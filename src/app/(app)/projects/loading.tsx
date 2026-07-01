import { Skeleton } from "@/components/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="p-6">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
