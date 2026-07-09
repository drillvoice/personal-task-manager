"use client";

import { useState, useTransition } from "react";
import { Mail, Phone } from "lucide-react";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import { createOrganisation, deletePerson, updatePerson } from "@/app/(app)/people/actions";
import type { PersonWithOrg } from "@/lib/server/people";

function PersonEditForm({
  person,
  orgs,
  onDone,
}: {
  person: PersonWithOrg;
  orgs: PickerOption[];
  onDone: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState(person.role);
  const [email, setEmail] = useState(person.email);
  const [phone, setPhone] = useState(person.phone);
  const [notes, setNotes] = useState(person.notes);
  const [orgId, setOrgId] = useState(person.orgId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await updatePerson({
        id: person.id,
        name,
        role,
        email,
        phone,
        notes,
        organisationId: orgId,
      });
      if (res.ok) {
        onDone();
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
      await deletePerson(person.id);
      onDone();
    });
  };

  const inputStyle = {
    background: "transparent",
    borderColor: "var(--color-line)",
    color: "var(--color-ink)",
  } as const;

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === "Escape") onDone();
  };

  return (
    <div
      className="border-b px-1 py-3"
      style={{ borderColor: "var(--color-line)" }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
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
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={3}
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
          {confirmDelete ? "Confirm delete?" : "Delete person"}
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
            onClick={onDone}
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

export function PersonRow({
  person,
  orgs,
}: {
  person: PersonWithOrg;
  orgs: PickerOption[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PersonEditForm
        person={person}
        orgs={orgs}
        onDone={() => setEditing(false)}
      />
    );
  }

  const meta = [person.role, person.orgName].filter(Boolean).join(" · ");
  const hasDetails = meta || person.email || person.phone;

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
        {person.name}
      </span>
      {hasDetails && (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {meta && (
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {meta}
            </span>
          )}
          {person.email && (
            <span
              className="font-mono flex items-center gap-1 text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              <Mail size={11} />
              {person.email}
            </span>
          )}
          {person.phone && (
            <span
              className="font-mono flex items-center gap-1 text-[11px]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              <Phone size={11} />
              {person.phone}
            </span>
          )}
        </div>
      )}
      {person.notes && (
        <p
          className="mt-1 text-[12px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {person.notes}
        </p>
      )}
    </div>
  );
}
