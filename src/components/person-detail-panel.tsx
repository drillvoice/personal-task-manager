"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, Users, X } from "lucide-react";
import Link from "next/link";
import { DueLabel } from "@/components/due-label";
import { EntityPicker } from "@/components/entity-picker";
import type { PickerOption } from "@/components/entity-picker";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  createGroup,
  createOrganisation,
  deletePerson,
  updatePerson,
} from "@/app/(app)/people/actions";
import type { PersonWithOrg } from "@/lib/server/people";

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
      className="rounded-card border p-4 bg-paper-raised border-line"
      onKeyDown={formKeyHandler}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-soft"
        >
          Person
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close person panel"
          className="-m-1 rounded p-1 text-ink-soft"
        >
          <X size={16} />
        </button>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="mb-2 w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
      />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
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
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          type="tel"
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
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
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px] text-danger"
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <ConfirmDeleteButton
          label="Delete person"
          pending={pending}
          onConfirm={del}
        />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-mono px-3 py-1.5 text-[12px] text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="font-mono px-3 py-1.5 text-[12px] font-semibold bg-ink text-paper"
            style={{ opacity: pending || !name.trim() ? 0.6 : 1 }}
          >
            Save
          </button>
        </div>
      </div>

      <div
        className="mt-4 border-t pt-3 border-line"
      >
        <h3
          className="font-mono mb-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-soft"
        >
          Recent meetings
        </h3>
        {person.meetings.length === 0 ? (
          <p
            className="font-mono text-[11px] text-ink-soft"
          >
            No meetings yet.
          </p>
        ) : (
          <div>
            {person.meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between gap-2 border-b py-2 last:border-b-0 border-line"
              >
                <span
                  className="min-w-0 flex-1 truncate text-[13px] text-ink"
                >
                  {m.title}
                </span>
                {m.status === "upcoming" ? (
                  <DueLabel dateIso={m.meetingDate} />
                ) : (
                  <span
                    className="font-mono flex items-center gap-1 text-[11px] font-medium whitespace-nowrap text-ink-soft"
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
