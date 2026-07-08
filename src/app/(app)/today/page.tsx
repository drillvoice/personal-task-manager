import { formatInTimeZone } from "date-fns-tz";
import { TaskRow } from "@/components/task-row";
import { PlanSlots } from "@/components/today-slots";
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

  const dateHeader = formatInTimeZone(
    new Date(),
    APP_TZ,
    "EEEE, d MMMM",
  ).toUpperCase();

  return (
    <div className="p-4">
      <header className="mb-6">
        <p
          className="font-mono mb-1 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {dateHeader}
        </p>
        <h1 className="font-display text-xl font-bold">Today&rsquo;s three</h1>
      </header>

      <PlanSlots
        slots={today.slots}
        pickerLabel="PICK ONE FOR TODAY"
        addAction={addToTodayPlan}
        loadEligibleAction={loadEligibleForTodayPlan}
        removeAction={removeFromTodayPlan}
        onToggleDone={setTaskDone}
      />

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2
            className="font-mono text-[11px] font-semibold"
            style={{ color: "var(--color-ink-soft)" }}
          >
            ALSO DUE TODAY
          </h2>
        </div>
        {today.alsoDue.length === 0 ? (
          <p
            className="font-mono rounded-[4px] border p-3 text-[12px]"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
              color: "var(--color-ink-soft)",
            }}
          >
            Nothing else due today. Nice.
          </p>
        ) : (
          <div
            className="rounded-[4px] border p-1 [&>*:last-child]:border-b-0"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
          >
            {today.alsoDue.map((t) => (
              <TaskRow key={t.id} task={t} showProject />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2
            className="font-mono text-[11px] font-semibold"
            style={{ color: "var(--color-ink-soft)" }}
          >
            TOMORROW&rsquo;S THREE
          </h2>
        </div>
        <PlanSlots
          slots={today.tomorrowSlots}
          pickerLabel="PICK ONE FOR TOMORROW"
          addAction={addToTomorrowPlan}
          loadEligibleAction={loadEligibleForTomorrowPlan}
          removeAction={removeFromTomorrowPlan}
        />
      </section>
    </div>
  );
}
