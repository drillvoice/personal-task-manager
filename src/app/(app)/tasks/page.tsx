import { TasksView } from "@/components/tasks-view";
import { requireUserId } from "@/lib/server/session";
import { loadContactOptions } from "@/lib/server/people";
import { loadTasksData, loadTaskTagOptions } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [data, contacts, tagOptions] = await Promise.all([
    loadTasksData(userId),
    loadContactOptions(userId),
    loadTaskTagOptions(userId),
  ]);
  return (
    <TasksView
      projects={data.projects}
      people={contacts.people}
      tagOptions={tagOptions}
    />
  );
}
