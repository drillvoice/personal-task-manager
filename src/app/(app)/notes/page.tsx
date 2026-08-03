import { NotesView } from "@/components/notes-view";
import { requireUserId } from "@/lib/server/session";
import { loadNotes } from "@/lib/server/notes";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await requireUserId();
  const query = (await searchParams).q ?? "";
  const notes = await loadNotes(userId, query);
  return <NotesView notes={notes} query={query} />;
}
