"use client";

import { useState, useTransition } from "react";
import { Plus, Users } from "lucide-react";
import { PersonRow } from "@/components/person-row";
import { EntityPicker } from "@/components/entity-picker";
import {
  createGroup,
  createOrganisation,
  createPerson,
  deleteGroup,
  deleteOrganisation,
  updateGroup,
  updateOrganisation,
} from "@/app/(app)/people/actions";
import type { OrganisationRow, PersonWithOrg } from "@/lib/server/people";

const inputStyle = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
} as const;

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

function GroupRow({ group }: { group: OrganisationRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [notes, setNotes] = useState(group.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        <span
          className="font-display text-[14px] font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          {group.name}
        </span>
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

  return (
    <div className="p-4 pb-24">
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
          <PersonRow key={p.id} person={p} orgs={orgs} groups={groups} />
        ))}
      </div>

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
          <GroupRow key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}
