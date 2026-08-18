"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, Plus, Users } from "lucide-react";
import { AddPersonForm } from "@/components/add-person-form";
import { PersonRow } from "@/components/person-row";
import { PersonDetailPanel } from "@/components/person-detail-panel";
import { EntityPicker } from "@/components/entity-picker";
import { NamedEntityRow } from "@/components/named-entity-row";
import { useIsDesktop } from "@/components/use-is-desktop";
import {
  deleteGroup,
  deleteOrganisation,
  setGroupMembers,
  updateGroup,
  updateOrganisation,
} from "@/app/(app)/people/actions";
import type {
  ContactOption,
  OrganisationRow,
  PersonWithOrg,
} from "@/lib/server/people";

function OrgRow({ org }: { org: OrganisationRow }) {
  return (
    <NamedEntityRow
      entity={org}
      deleteLabel="Delete organisation"
      onSave={(fields) => updateOrganisation({ id: org.id, ...fields })}
      onDelete={() => deleteOrganisation(org.id)}
    />
  );
}

function GroupRow({
  group,
  people,
}: {
  group: OrganisationRow;
  people: PersonWithOrg[];
}) {
  const [, startTransition] = useTransition();

  const memberIds = people
    .filter((p) => p.groups.some((g) => g.id === group.id))
    .map((p) => p.id);
  const personOptions: ContactOption[] = people.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const changeMembers = (nextIds: string[]) => {
    startTransition(async () => {
      await setGroupMembers({ groupId: group.id, personIds: nextIds });
    });
  };

  return (
    <NamedEntityRow
      entity={group}
      deleteLabel="Delete group"
      subtitle={`${memberIds.length} ${
        memberIds.length === 1 ? "member" : "members"
      }`}
      extraFields={
        <EntityPicker
          mode="multi"
          options={personOptions}
          selectedIds={memberIds}
          onChange={changeMembers}
          placeholder="Add member…"
          icon={Users}
        />
      }
      onSave={(fields) => updateGroup({ id: group.id, ...fields })}
      onDelete={() => deleteGroup(group.id)}
    />
  );
}

export function PeopleView({
  people,
  orgs,
  groups,
}: {
  people: PersonWithOrg[];
  orgs: OrganisationRow[];
  groups: OrganisationRow[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [groupByOrg, setGroupByOrg] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  // People arrive already sorted by name, so each bucket stays name-ordered;
  // orgs are sorted alphabetically and the unaffiliated bucket trails last.
  const orgBuckets = useMemo(() => {
    const byOrg = new Map<
      string,
      { id: string; name: string; people: PersonWithOrg[] }
    >();
    const noOrg: PersonWithOrg[] = [];
    for (const p of people) {
      if (p.orgId && p.orgName) {
        const bucket = byOrg.get(p.orgId) ?? {
          id: p.orgId,
          name: p.orgName,
          people: [],
        };
        bucket.people.push(p);
        byOrg.set(p.orgId, bucket);
      } else {
        noOrg.push(p);
      }
    }
    const sorted = [...byOrg.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { sorted, noOrg };
  }, [people]);

  // Derived from server data, so deleting the selected person (which removes it
  // on revalidation) closes the panel.
  const selectedPerson =
    selectedPersonId !== null
      ? (people.find((p) => p.id === selectedPersonId) ?? null)
      : null;

  const onSelectPerson = isDesktop
    ? (id: string) =>
        setSelectedPersonId((prev) => (prev === id ? null : id))
    : undefined;

  return (
    <div className="p-4 pb-24 md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] md:items-start md:gap-6">
      <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">People</h1>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-accent text-paper-raised"
        >
          <Plus size={12} /> New person
        </button>
      </div>

      {showAdd && (
        <AddPersonForm
          orgs={orgs}
          groups={groups}
          onDone={() => setShowAdd(false)}
        />
      )}

      {people.length > 0 && (
        <div className="mb-2 flex justify-end">
          <div
            className="flex gap-1 card p-0.5"
          >
            {(
              [
                ["name", "Alphabetical"],
                ["org", "By organisation"],
              ] as const
            ).map(([value, label]) => {
              const active = (value === "org") === groupByOrg;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGroupByOrg(value === "org")}
                  className="font-mono rounded px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    background: active ? "var(--color-ink)" : "transparent",
                    color: active
                      ? "var(--color-paper)"
                      : "var(--color-ink-soft)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(people.length === 0 || !groupByOrg) && (
        <div
          className="mb-4 card p-1 px-3"
        >
          {people.length === 0 && (
            <p
              className="p-3 text-[13px] text-ink-soft"
            >
              No people yet.
            </p>
          )}
          {people.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              orgs={orgs}
              groups={groups}
              selected={p.id === selectedPersonId}
              onSelect={onSelectPerson ? () => onSelectPerson(p.id) : undefined}
            />
          ))}
        </div>
      )}

      {people.length > 0 && groupByOrg && (
        <div className="mb-4 space-y-3">
          {[
            ...orgBuckets.sorted,
            ...(orgBuckets.noOrg.length > 0
              ? [{ id: "__none__", name: "No organisation", people: orgBuckets.noOrg }]
              : []),
          ].map((bucket) => (
            <div
              key={bucket.id}
              className="overflow-hidden card"
            >
              <div
                className="flex items-center gap-1.5 border-b px-3 py-2 border-line bg-accent"
              >
                <Building2 className="text-paper-raised" size={14} />
                <h3
                  className="font-display text-[15px] font-bold text-paper-raised"
                >
                  {bucket.name}
                </h3>
                <span
                  className="font-mono ml-auto text-[11px] text-paper-raised"
                >
                  {bucket.people.length}
                </span>
              </div>
              <div className="px-3 [&>*:last-child]:border-b-0">
                {bucket.people.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    orgs={orgs}
                    groups={groups}
                    selected={p.id === selectedPersonId}
                    onSelect={
                      onSelectPerson ? () => onSelectPerson(p.id) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2
        className="font-mono mb-2 text-[11px] font-semibold tracking-wide uppercase text-ink-soft"
      >
        Organisations
      </h2>
      <div
        className="mb-4 card p-1 px-3"
      >
        {orgs.length === 0 && (
          <p
            className="p-3 text-[13px] text-ink-soft"
          >
            No organisations yet — create one from the person form.
          </p>
        )}
        {orgs.map((o) => (
          <OrgRow key={o.id} org={o} />
        ))}
      </div>

      <h2
        className="font-mono mb-2 text-[11px] font-semibold tracking-wide uppercase text-ink-soft"
      >
        Groups
      </h2>
      <div
        className="card p-1 px-3"
      >
        {groups.length === 0 && (
          <p
            className="p-3 text-[13px] text-ink-soft"
          >
            No groups yet — create one from the person form, then add it as a
            meeting attendee to bring in everyone at once.
          </p>
        )}
        {groups.map((g) => (
          <GroupRow key={g.id} group={g} people={people} />
        ))}
      </div>
      </div>

      <div className="hidden md:block md:self-stretch">
        {/* Spacers mirroring the header row and the sort toggle above the list,
            so the sticky panel top lines up with the top of the people list. */}
        <div aria-hidden className="invisible mb-4">
          <h1 className="font-display text-xl font-bold">People</h1>
        </div>
        {people.length > 0 && (
          <div aria-hidden className="invisible mb-2 flex justify-end">
            <div className="flex gap-1 rounded-card border p-0.5">
              <span className="font-mono rounded px-2.5 py-1 text-[11px] font-medium">
                By organisation
              </span>
            </div>
          </div>
        )}
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] min-w-0 overflow-y-auto">
        {selectedPerson ? (
          <PersonDetailPanel
            key={selectedPerson.id}
            person={selectedPerson}
            orgs={orgs}
            groups={groups}
            onClose={() => setSelectedPersonId(null)}
          />
        ) : (
          <div
            className="font-mono flex min-h-[220px] items-center justify-center rounded-card border border-dashed text-[11px] border-line text-ink-soft"
          >
            Select a person to edit
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
