import { MeetingsView } from "@/components/meetings-view";
import { requireUserId } from "@/lib/server/session";
import { loadContactOptions } from "@/lib/server/people";
import { loadMeetingsData } from "@/lib/server/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const userId = await requireUserId();
  const [data, contacts] = await Promise.all([
    loadMeetingsData(userId),
    loadContactOptions(userId),
  ]);
  return <MeetingsView meetings={data.meetings} people={contacts.people} />;
}
