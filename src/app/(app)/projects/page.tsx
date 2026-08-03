import { ProjectsTable } from "@/components/projects-table";
import { requireUserId } from "@/lib/server/session";
import { loadProjectsTable } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const userId = await requireUserId();
  const includeArchived = (await searchParams).archived === "1";
  const data = await loadProjectsTable(userId, includeArchived);
  return <ProjectsTable data={data} includeArchived={includeArchived} />;
}
