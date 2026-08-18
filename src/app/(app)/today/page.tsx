import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { AlsoDueList } from "@/components/also-due-list";
import { PlanSlots } from "@/components/today-slots";
import { TaskEditorProvider } from "@/components/task-editor-overlay";
import { PlanDndProvider } from "@/components/today-plan-dnd";
import { requireUserId } from "@/lib/server/session";
import { loadTodayData } from "@/lib/server/today";
import { APP_TZ } from "@/lib/time";
import {
  addToTodayPlan,
  addToTomorrowPlan,
  loadEligibleForTodayPlan,
  loadEligibleForTomorrowPlan,
  removeFromTodayPlan,
  removeFromTomorrowPlan,
  setTaskDone,
} from "@/app/(app)/today/actions";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const userId = await requireUserId();
  const today = await loadTodayData(userId);

  const dateHeader = formatInTimeZone(new Date(), APP_TZ, "EEEE, d MMMM");

  return (
    <div className="p-4">
      <header className="mb-6">
        <p
          className="font-mono mb-1 text-[11px] text-ink-soft"
        >
          {dateHeader}
        </p>
        <h1 className="font-display text-xl font-bold">Today</h1>
      </header>

      <TaskEditorProvider>
        <PlanDndProvider>
          <section className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="font-mono text-[11px] font-semibold text-ink-soft"
              >
                This week&rsquo;s three
              </h2>
            </div>
            {today.weeklyPriorities.length === 0 ? (
              <p
                className="font-mono rounded-card border p-3 text-[12px] bg-paper-raised border-line text-ink-soft"
              >
                No weekly priorities set.{" "}
                <Link href="/review" className="underline">
                  Run your weekly review
                </Link>
                .
              </p>
            ) : (
              <AlsoDueList tasks={today.weeklyPriorities} />
            )}
          </section>

          <section className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="font-mono text-[11px] font-semibold text-ink-soft"
              >
                Today&rsquo;s three
              </h2>
            </div>
            <PlanSlots
              slots={today.slots}
              pickerLabel="Add to today"
              addAction={addToTodayPlan}
              loadEligibleAction={loadEligibleForTodayPlan}
              removeAction={removeFromTodayPlan}
              onToggleDone={setTaskDone}
            />
          </section>

          <section className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="font-mono text-[11px] font-semibold text-ink-soft"
              >
                Also due today
              </h2>
            </div>
            {today.alsoDue.length === 0 ? (
              <p
                className="font-mono rounded-card border p-3 text-[12px] bg-paper-raised border-line text-ink-soft"
              >
                Nothing else due today. Nice.
              </p>
            ) : (
              <AlsoDueList tasks={today.alsoDue} draggable />
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="font-mono text-[11px] font-semibold text-ink-soft"
              >
                Tomorrow&rsquo;s three
              </h2>
            </div>
            <PlanSlots
              slots={today.tomorrowSlots}
              pickerLabel="Add to tomorrow"
              addAction={addToTomorrowPlan}
              loadEligibleAction={loadEligibleForTomorrowPlan}
              removeAction={removeFromTomorrowPlan}
            />
          </section>
        </PlanDndProvider>
      </TaskEditorProvider>
    </div>
  );
}
