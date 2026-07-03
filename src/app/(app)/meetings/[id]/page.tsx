import { notFound } from "next/navigation";
import { MeetingDetailView } from "@/components/meeting-detail-view";
import { requireUserId } from "@/lib/server/session";
import { loadContactOptions } from "@/lib/server/people";
import { loadMeetingDetail, loadTagOptions } from "@/lib/server/meetings";
import { loadProjectOptions } from "@/lib/server/projects";
import { loadTaskTagOptions } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [meeting, contacts, projects, availableTags, taskTagOptions] =
    await Promise.all([
      loadMeetingDetail(userId, id),
      loadContactOptions(userId),
      loadProjectOptions(userId),
      loadTagOptions(userId),
      loadTaskTagOptions(userId),
    ]);
  if (!meeting) notFound();
  return (
    <MeetingDetailView
      meeting={meeting}
      people={contacts.people}
      projects={projects}
      availableTags={availableTags}
      taskTagOptions={taskTagOptions}
    />
  );
}
