"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { Building2, Plus, Users } from "lucide-react";
import { PersonRow } from "@/components/person-row";
import { PersonDetailPanel } from "@/components/person-detail-panel";
import { EntityPicker } from "@/components/entity-picker";
import {
  addGroupMember,
  createGroup,
  createOrganisation,
  createPerson,
  deleteGroup,
  deleteOrganisation,
  removeGroupMember,
  updateGroup,
  updateOrganisation,
} from "@/app/(app)/people/actions";
import type {
  ContactOption,
  OrganisationRow,
  PersonWithOrg,
} from "@/lib/server/people";

const inputStyle = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
} as const;

// The detail panel is desktop-only; below md, rows keep inline editing.
const DESKTOP_QUERY = "(min-width: 768px)";

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function AddPersonForm({
  orgs,
  groups,
  onDone,
}: {
  orgs: OrganisationRow[];
  groups: OrganisationRow[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orgId, setOrgId] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createPerson({
        name,
        role,
        email,
        phone,
        notes,
        organisationId: orgId,
        groupIds,
      });
      if (res.ok) {
        onDone();
      } else {
        setError(res.error);
      }
    });
  };

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onDone();
  };

  const formKeyHandler = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="mb-4 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
      onKeyDown={formKeyHandler}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name…"
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
        autoFocus
        onKeyDown={keyHandler}
      />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-full border p-2 text-[13px] outline-none"
          style={inputStyle}
          onKeyDown={keyHandler}
        />
        <EntityPicker
          mode="single"
          options={orgs}
          selectedIds={orgId ? [orgId] : []}
          onChange={(ids) => setOrgId(ids[0] ?? "")}
          onCreate={async (name) => {
            const res = await createOrganisation({ name });
            return res.ok ? { id: res.id, name } : null;
          }}
          placeholder="Organisation…"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full border p-2 text-[13px] outline-none"
          style={inputStyle}
          onKeyDown={keyHandler}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          type="tel"
          className="w-full border p-2 text-[13px] outline-none"
          style={inputStyle}
          onKeyDown={keyHandler}
        />
      </div>
      <div className="mb-2">
        <EntityPicker
          mode="multi"
          options={groups}
          selectedIds={groupIds}
          onChange={setGroupIds}
          onCreate={async (name) => {
            const res = await createGroup({ name });
            return res.ok ? { id: res.id, name } : null;
          }}
          placeholder="Groups…"
          icon={Users}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none"
        style={inputStyle}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="font-mono px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: pending || !name.trim() ? 0.6 : 1,
          }}
        >
          Add person
        </button>
        <button
          type="button"
          onClick={onDone}
          className="font-mono px-3 py-1.5 text-[12px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function OrgRow({ org }: { org: OrganisationRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [notes, setNotes] = useState(org.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await updateOrganisation({ id: org.id, name, notes });
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteOrganisation(org.id);
    });
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer border-b px-1 py-2.5"
        style={{ borderColor: "var(--color-line)" }}
        onClick={() => setEditing(true)}
      >
        <span
          className="font-display text-[14px] font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          {org.name}
        </span>
        {org.notes && (
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {org.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="border-b px-1 py-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none"
        style={inputStyle}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={del}
          disabled={pending}
          className="font-mono text-[11px]"
          style={{
            color: confirmDelete
              ? "var(--color-danger)"
              : "var(--color-ink-soft)",
          }}
        >
          {confirmDelete ? "Confirm delete?" : "Delete organisation"}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-mono ml-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Keep
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="font-mono px-3 py-1.5 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              opacity: pending || !name.trim() ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupRow({
  group,
  people,
}: {
  group: OrganisationRow;
  people: PersonWithOrg[];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [notes, setNotes] = useState(group.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const members = people.filter((p) =>
    p.groups.some((g) => g.id === group.id),
  );
  const memberIds = members.map((p) => p.id);
  const personOptions: ContactOption[] = people.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const changeMembers = (nextIds: string[]) => {
    const added = nextIds.filter((id) => !memberIds.includes(id));
    const removed = memberIds.filter((id) => !nextIds.includes(id));
    startTransition(async () => {
      for (const personId of added) {
        await addGroupMember({ groupId: group.id, personId });
      }
      for (const personId of removed) {
        await removeGroupMember({ groupId: group.id, personId });
      }
    });
  };

  const save = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await updateGroup({ id: group.id, name, notes });
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  };

  const del = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteGroup(group.id);
    });
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer border-b px-1 py-2.5"
        style={{ borderColor: "var(--color-line)" }}
        onClick={() => setEditing(true)}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-[14px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {group.name}
          </span>
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
        {group.notes && (
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {group.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="border-b px-1 py-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div className="mb-2">
        <EntityPicker
          mode="multi"
          options={personOptions}
          selectedIds={memberIds}
          onChange={changeMembers}
          placeholder="Add member…"
          icon={Users}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none"
        style={inputStyle}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px]"
          style={{ color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={del}
          disabled={pending}
          className="font-mono text-[11px]"
          style={{
            color: confirmDelete
              ? "var(--color-danger)"
              : "var(--color-ink-soft)",
          }}
        >
          {confirmDelete ? "Confirm delete?" : "Delete group"}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-mono ml-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Keep
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="font-mono px-3 py-1.5 text-[12px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              opacity: pending || !name.trim() ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
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
          className="font-mono flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-paper-raised)",
          }}
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
            className="flex gap-1 rounded-[4px] border p-0.5"
            style={{
              background: "var(--color-paper-raised)",
              borderColor: "var(--color-line)",
            }}
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
          className="mb-4 rounded-[4px] border p-1 px-3"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          {people.length === 0 && (
            <p
              className="p-3 text-[13px]"
              style={{ color: "var(--color-ink-soft)" }}
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
              className="overflow-hidden rounded-[4px] border"
              style={{
                background: "var(--color-paper-raised)",
                borderColor: "var(--color-line)",
              }}
            >
              <div
                className="flex items-center gap-1.5 border-b px-3 py-2"
                style={{
                  borderColor: "var(--color-line)",
                  background: "var(--color-paper)",
                }}
              >
                <Building2 size={14} style={{ color: "var(--color-ink-soft)" }} />
                <h3
                  className="font-display text-[15px] font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {bucket.name}
                </h3>
                <span
                  className="font-mono ml-auto text-[11px]"
                  style={{ color: "var(--color-ink-soft)" }}
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
        className="font-mono mb-2 text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Organisations
      </h2>
      <div
        className="mb-4 rounded-[4px] border p-1 px-3"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
        }}
      >
        {orgs.length === 0 && (
          <p
            className="p-3 text-[13px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            No organisations yet — create one from the person form.
          </p>
        )}
        {orgs.map((o) => (
          <OrgRow key={o.id} org={o} />
        ))}
      </div>

      <h2
        className="font-mono mb-2 text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Groups
      </h2>
      <div
        className="rounded-[4px] border p-1 px-3"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
        }}
      >
        {groups.length === 0 && (
          <p
            className="p-3 text-[13px]"
            style={{ color: "var(--color-ink-soft)" }}
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
            <div className="flex gap-1 rounded-[4px] border p-0.5">
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
            className="font-mono flex min-h-[220px] items-center justify-center rounded-[4px] border border-dashed text-[11px]"
            style={{
              borderColor: "var(--color-line)",
              color: "var(--color-ink-soft)",
            }}
          >
            Select a person to edit
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
