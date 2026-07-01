import { ProjectsTable } from "@/components/projects-table";
import { requireUserId } from "@/lib/server/session";
import { loadProjectsTable } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const userId = await requireUserId();
  const data = await loadProjectsTable(userId);
  return <ProjectsTable data={data} />;
}
