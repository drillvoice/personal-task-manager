import { TasksView } from "@/components/tasks-view";
import { requireUserId } from "@/lib/server/session";
import { loadContactOptions } from "@/lib/server/people";
import { loadTasksData } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [data, contacts] = await Promise.all([
    loadTasksData(userId),
    loadContactOptions(userId),
  ]);
  return <TasksView projects={data.projects} people={contacts.people} />;
}
