import { TasksView } from "@/components/tasks-view";
import { requireUserId } from "@/lib/server/session";
import { loadTasksData } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await requireUserId();
  const data = await loadTasksData(userId);
  return <TasksView projects={data.projects} />;
}
