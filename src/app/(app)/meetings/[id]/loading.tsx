import { Skeleton } from "@/components/skeleton";

export default function MeetingDetailLoading() {
  return (
    <div className="p-4">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-4 h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
