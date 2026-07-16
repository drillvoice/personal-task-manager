import { PeopleView } from "@/components/people-view";
import { requireUserId } from "@/lib/server/session";
import { loadPeopleData } from "@/lib/server/people";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const userId = await requireUserId();
  const data = await loadPeopleData(userId);
  return (
    <PeopleView people={data.people} orgs={data.orgs} groups={data.groups} />
  );
}
