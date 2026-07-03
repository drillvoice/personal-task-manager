import { notFound } from "next/navigation";
import { MeetingDetailView } from "@/components/meeting-detail-view";
import { requireUserId } from "@/lib/server/session";
import { loadContactOptions } from "@/lib/server/people";
import { loadMeetingDetail, loadTagOptions } from "@/lib/server/meetings";
import { loadProjectOptions } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [meeting, contacts, projects, availableTags] = await Promise.all([
    loadMeetingDetail(userId, id),
    loadContactOptions(userId),
    loadProjectOptions(userId),
    loadTagOptions(userId),
  ]);
  if (!meeting) notFound();
  return (
    <MeetingDetailView
      meeting={meeting}
      people={contacts.people}
      orgs={contacts.orgs}
      projects={projects}
      availableTags={availableTags}
    />
  );
}
