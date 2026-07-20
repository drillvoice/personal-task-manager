"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, Users, X } from "lucide-react";
import Link from "next/link";
import { DueLabel } from "@/components/due-label";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import {
  createGroup,
  createOrganisation,
  deletePerson,
  updatePerson,
} from "@/app/(app)/people/actions";
import type { PersonWithOrg } from "@/lib/server/people";

const inputStyle = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
} as const;

export function PersonDetailPanel({
  person,
  orgs,
  groups,
  onClose,
}: {
  person: PersonWithOrg;
  orgs: PickerOption[];
  groups: PickerOption[];
  onClose: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState(person.role);
  const [email, setEmail] = useState(person.email);
  const [phone, setPhone] = useState(person.phone);
  const [notes, setNotes] = useState(person.notes);
  const [orgId, setOrgId] = useState(person.orgId ?? "");
  const [groupIds, setGroupIds] = useState(person.groups.map((g) => g.id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        el.blur();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        groupIds,
      });
      if (res.ok) {
        onClose();
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
      onClose();
    });
  };

  const formKeyHandler = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  return (
    <div
      className="rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
      onKeyDown={formKeyHandler}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Person
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close person panel"
          className="-m-1 rounded p-1"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <X size={16} />
        </button>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={inputStyle}
      />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-full border p-2 text-[13px] outline-none"
          style={inputStyle}
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
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          type="tel"
          className="w-full border p-2 text-[13px] outline-none"
          style={inputStyle}
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
        rows={3}
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none"
        style={inputStyle}
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
            onClick={onClose}
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

      <div
        className="mt-4 border-t pt-3"
        style={{ borderColor: "var(--color-line)" }}
      >
        <h3
          className="font-mono mb-2 text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Recent meetings
        </h3>
        {person.meetings.length === 0 ? (
          <p
            className="font-mono text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            No meetings yet.
          </p>
        ) : (
          <div>
            {person.meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between gap-2 border-b py-2 last:border-b-0"
                style={{ borderColor: "var(--color-line)" }}
              >
                <span
                  className="min-w-0 flex-1 truncate text-[13px]"
                  style={{ color: "var(--color-ink)" }}
                >
                  {m.title}
                </span>
                {m.status === "upcoming" ? (
                  <DueLabel dateIso={m.meetingDate} />
                ) : (
                  <span
                    className="font-mono flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
                    style={{ color: "var(--color-ink-soft)" }}
                  >
                    <CalendarDays size={11} strokeWidth={2} />
                    {m.meetingDate}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
