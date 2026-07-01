import { ReviewView } from "@/components/review-view";
import { requireUserId } from "@/lib/server/session";
import { loadReviewData } from "@/lib/server/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const userId = await requireUserId();
  const data = await loadReviewData(userId);
  return <ReviewView data={data} />;
}
