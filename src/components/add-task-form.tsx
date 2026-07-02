"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/app/(app)/tasks/actions";
import { ProjectDropdown } from "@/components/project-dropdown";
import type { ProjectOption } from "@/components/project-dropdown";
import { ContactDropdown } from "@/components/contact-dropdown";
import type { ContactSelection } from "@/components/contact-dropdown";
import type { ContactOption } from "@/lib/server/people";

export function AddTaskForm({
  projects,
  people = [],
  orgs = [],
  onCancel,
  onCreated,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  people?: ContactOption[];
  orgs?: ContactOption[];
  onCancel: () => void;
  onCreated: () => void;
  defaultProjectId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId ?? projects.find((p) => p.id !== null)?.id ?? "",
  );
  const [priority, setPriority] = useState<1 | 2 | 3>(3);
  const [dueDate, setDueDate] = useState("");
  const [personId, setPersonId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setContact = (sel: ContactSelection) => {
    setPersonId(sel.type === "person" ? sel.id : "");
    setOrgId(sel.type === "org" ? sel.id : "");
  };

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTask({
        title,
        projectId: projectId === "" ? null : projectId,
        personId: personId || null,
        orgId: orgId || null,
        priority,
        dueDate: dueDate || null,
        status: "next_action",
      });
      if (res.ok) {
        setTitle("");
        setDueDate("");
        setPersonId("");
        setOrgId("");
        onCreated();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div
      className="mb-4 rounded-[4px] border p-4"
      style={{
        background: "var(--color-paper-raised)",
        borderColor: "var(--color-line)",
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        className="mb-2 w-full border p-2 text-[13px] outline-none"
        style={{
          background: "transparent",
          borderColor: "var(--color-line)",
          color: "var(--color-ink)",
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_auto] sm:items-start">
        <div className="min-w-0">
          <ProjectDropdown
            projects={projects}
            value={projectId}
            onChange={setProjectId}
          />
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border p-2 text-[13px] outline-none sm:w-[160px]"
          style={{
            background: "transparent",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
        <div className="grid grid-cols-3 items-center gap-1 sm:flex">
          {[1, 2, 3].map((p) => {
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p as 1 | 2 | 3)}
                className="font-mono border px-2.5 py-2 text-[11px] font-semibold"
                style={{
                  borderColor: active ? `var(--color-p${p})` : "var(--color-line)",
                  background: active ? `var(--color-p${p})` : "transparent",
                  color: active
                    ? "var(--color-paper-raised)"
                    : "var(--color-ink-soft)",
                }}
              >
                P{p}
              </button>
            );
          })}
        </div>
      </div>
      {showContact ? (
        <div className="mb-3 sm:max-w-[320px]">
          <ContactDropdown
            people={people}
            orgs={orgs}
            personId={personId}
            orgId={orgId}
            onChange={setContact}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowContact(true)}
          className="font-mono mb-3 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          + contact
        </button>
      )}
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
          onClick={onCancel}
          className="font-mono px-3 py-1.5 text-[12px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !title.trim()}
          className="font-mono px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            opacity: pending || !title.trim() ? 0.6 : 1,
          }}
        >
          Add task
        </button>
      </div>
    </div>
  );
}
