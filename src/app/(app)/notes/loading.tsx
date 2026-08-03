import { Skeleton } from "@/components/skeleton";

export default function NotesLoading() {
  return (
    <div className="p-4">
      <header className="mb-4">
        <Skeleton className="mb-2 h-[14px] w-24" />
        <Skeleton className="h-6 w-24" />
      </header>
      <Skeleton className="mb-5 h-9 w-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
