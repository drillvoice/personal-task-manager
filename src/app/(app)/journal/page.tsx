import { redirect } from "next/navigation";
import { todayIso } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function JournalIndexPage() {
  redirect(`/journal/${todayIso()}`);
}
