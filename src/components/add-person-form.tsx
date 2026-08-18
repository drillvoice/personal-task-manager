"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { Users } from "lucide-react";
import { EntityPicker } from "@/components/entity-picker";
import {
  createGroup,
  createOrganisation,
  createPerson,
} from "@/app/(app)/people/actions";
import type { OrganisationRow } from "@/lib/server/people";

export function AddPersonForm({
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
      className="mb-4 card p-4"
      onKeyDown={formKeyHandler}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name…"
        className="mb-2 w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
        autoFocus
        onKeyDown={keyHandler}
      />
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
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
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
          onKeyDown={keyHandler}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          type="tel"
          className="w-full border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
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
        className="mb-2 w-full resize-y border p-2 text-[13px] outline-none bg-transparent border-line text-ink"
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
      />
      {error && (
        <p
          className="font-mono mb-2 text-[11px] text-danger"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="primary"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          Add person
        </Button>
        <Button
          variant="quiet"
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
