import React, { useState, useMemo } from "react";
import {
  Check, ChevronDown, ChevronRight, Plus, Circle, CalendarDays,
  ListTodo, RefreshCw, X, Flag, Search, Grid3x3
} from "lucide-react";

const TOKENS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

  .gtd-app {
    --paper: #EEEEE7;
    --paper-raised: #F8F8F2;
    --ink: #1C1E1B;
    --ink-soft: #6E6C61;
    --line: #D6D5C8;
    --accent: #E15A2B;
    --accent-soft: #F7DCC9;
    --teal: #2E5F5C;
    --teal-soft: #DCE7E3;
    --danger: #9B3B3B;
    --p1: #B23A2E; --p1-soft: #F6DAD4;
    --p2: #B8791E; --p2-soft: #F3E3C6;
    --p3: #2E6B52; --p3-soft: #D9EAE1;
    font-family: 'Inter', sans-serif;
    background: var(--paper);
    color: var(--ink);
  }
  .gtd-display { font-family: 'Space Grotesk', sans-serif; }
  .gtd-mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.01em; }

  .gtd-card {
    background: var(--paper-raised);
    border: 1px solid var(--line);
    border-radius: 4px;
  }
  .gtd-slot-empty {
    background: transparent;
    border: 1.5px dashed var(--line);
    border-radius: 4px;
  }
  .gtd-tab { border-radius: 999px; }
  .gtd-checkbox {
    width: 18px; height: 18px; border-radius: 4px;
    border: 1.5px solid var(--ink-soft); flex-shrink: 0;
  }
  .gtd-checkbox.done { background: var(--teal); border-color: var(--teal); }
  .gtd-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
  .gtd-scrollbar::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

  .gtd-history-table { border-collapse: separate; border-spacing: 0; }
  .gtd-history-table th, .gtd-history-table td { border-bottom: 1px solid var(--line); border-right: 1px solid var(--line); }
  .gtd-hcell {
    display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;
    overflow: hidden; cursor: pointer;
  }
  .gtd-hcell.expanded { -webkit-line-clamp: unset; }

  .gtd-input {
    background: transparent; border: 1px solid var(--line); padding: 8px;
    font-size: 13px; outline: none; color: var(--ink);
  }
`;

const historyWeeks = ["9 Jun", "16 Jun", "23 Jun", "30 Jun"];

const seedProjects = [
  {
    id: "inbox", name: "Inbox (no project)", status: "active", notes: "", weeklyNotes: {},
    tasks: [],
  },
  {
    id: "p1", name: "Better Renting — Board update", status: "active",
    notes: "Board wants the Q3 impact numbers before the funding conversation. Need Tara Cheyne's office to confirm the meeting slot.",
    weeklyNotes: {
      "9 Jun": "Kicked off Q3 report structure.",
      "16 Jun": "Waiting on finance figures from ops.",
      "23 Jun": "—",
      "30 Jun": "Board wants Q3 numbers before funding conversation. Tara Cheyne's office to confirm slot.",
    },
    tasks: [
      { id: "t1", title: "Draft Q3 impact report outline", tag: "writing", due: "Fri", status: "next_action", priority: 2 },
      { id: "t2", title: "Follow up with Tara Cheyne's office", tag: "advocacy", due: "Today", status: "waiting_on", priority: 1 },
    ],
  },
  {
    id: "p2", name: "ELAN — EC responsibilities", status: "active",
    notes: "Pipe repair invoice needs sign-off. Gate quote still outstanding from the contractor.",
    weeklyNotes: {
      "9 Jun": "Pipe repair scheduled with plumber.",
      "16 Jun": "Plasterer booked for following week.",
      "23 Jun": "Invoice received, needs EC sign-off.",
      "30 Jun": "Approved pipe repair invoice. Still chasing gate quote.",
    },
    tasks: [
      { id: "t3", title: "Approve pipe repair invoice", tag: "admin", due: "Today", status: "next_action", priority: 1 },
      { id: "t4", title: "Chase gate repair quote", tag: "admin", due: null, status: "waiting_on", priority: 3 },
    ],
  },
  {
    id: "p3", name: "Watson property purchase", status: "active",
    notes: "Offer accepted. Now working through due diligence before finance is locked in.",
    weeklyNotes: {
      "9 Jun": "—",
      "16 Jun": "Offer accepted!",
      "23 Jun": "Contract review with conveyancer.",
      "30 Jun": "Confirming building & pest inspection date.",
    },
    tasks: [
      { id: "t5", title: "Confirm building & pest inspection date", tag: "house", due: "Tomorrow", status: "next_action", priority: 1 },
      { id: "t6", title: "Send signed contract to conveyancer", tag: "house", due: null, status: "done", priority: 3 },
    ],
  },
  {
    id: "p4", name: "Summer Foundation — accessibility standards", status: "active",
    notes: "Reviewing the latest draft standard before next working group session.",
    weeklyNotes: {
      "9 Jun": "Draft standard v2 circulated.",
      "16 Jun": "—",
      "23 Jun": "Feedback compiled for working group.",
      "30 Jun": "Reading draft standard v3.",
    },
    tasks: [{ id: "t7", title: "Read draft standard v3", tag: "reading", due: null, status: "next_action", priority: 3 }],
  },
  {
    id: "p5", name: "Frosthaven — outpost phase", status: "someday_maybe", notes: "",
    weeklyNotes: { "9 Jun": "—", "16 Jun": "—", "23 Jun": "—", "30 Jun": "Read outpost rules before next session." },
    tasks: [{ id: "t8", title: "Read outpost rules before next session", tag: "personal", due: null, status: "next_action", priority: 3 }],
  },
];

function TagChip({ children, tone = "teal" }) {
  const style = tone === "teal"
    ? { background: "var(--teal-soft)", color: "var(--teal)" }
    : { background: "var(--accent-soft)", color: "var(--accent)" };
  return <span className="gtd-mono gtd-tab px-2 py-0.5 text-[11px] font-medium" style={style}>{children}</span>;
}

function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className="gtd-mono gtd-tab px-2 py-0.5 text-[11px] font-semibold" style={{ background: `var(--p${priority}-soft)`, color: `var(--p${priority})` }}>
      P{priority}
    </span>
  );
}

function DueLabel({ due }) {
  if (!due) return null;
  const isToday = due === "Today";
  return (
    <span className="gtd-mono text-[11px] font-medium flex items-center gap-1" style={{ color: isToday ? "var(--danger)" : "var(--ink-soft)" }}>
      <CalendarDays size={11} strokeWidth={2} />{due}
    </span>
  );
}

function TaskRow({ task, projectName }) {
  const [done, setDone] = useState(task.status === "done");
  return (
    <div className="flex items-center gap-2 py-2.5 px-1 border-b flex-wrap" style={{ borderColor: "var(--line)" }}>
      <button onClick={() => setDone(!done)} className={`gtd-checkbox flex items-center justify-center ${done ? "done" : ""}`}>
        {done && <Check size={12} color="var(--paper-raised)" strokeWidth={3} />}
      </button>
      <span className="flex-1 text-[14px] min-w-[120px]" style={{ color: done ? "var(--ink-soft)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>
        {task.title}
      </span>
      {projectName && <span className="gtd-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>{projectName}</span>}
      <PriorityBadge priority={task.priority} />
      {task.status === "waiting_on" && <TagChip tone="accent">waiting</TagChip>}
      <TagChip>{task.tag}</TagChip>
      <DueLabel due={task.due} />
    </div>
  );
}

function ProjectRow({ project }) {
  const [open, setOpen] = useState(project.status === "active");
  const activeCount = project.tasks.filter((t) => t.status !== "done").length;
  return (
    <div className="gtd-card mb-2 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="gtd-display font-semibold text-[15px] flex-1">{project.name}</span>
        <span className="gtd-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>{activeCount} open</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {project.notes && (
            <p className="text-[13px] mb-2 pb-2 border-b" style={{ color: "var(--ink-soft)", borderColor: "var(--line)" }}>{project.notes}</p>
          )}
          {project.tasks.length === 0 && <p className="text-[12px] py-2" style={{ color: "var(--ink-soft)" }}>No tasks yet.</p>}
          {project.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

function PrioritySlot({ number, task, onClear }) {
  if (!task) {
    return (
      <div className="gtd-slot-empty flex-1 min-w-[140px] p-4 flex flex-col items-center justify-center gap-2 min-h-[110px]">
        <span className="gtd-display text-2xl font-bold" style={{ color: "var(--line)" }}>{number}</span>
        <span className="gtd-mono text-[11px] flex items-center gap-1" style={{ color: "var(--ink-soft)" }}><Plus size={12} /> open slot</span>
      </div>
    );
  }
  return (
    <div className="gtd-card flex-1 min-w-[140px] p-4 flex flex-col justify-between min-h-[110px]" style={{ borderColor: "var(--accent)", borderWidth: 1.5 }}>
      <div className="flex items-start justify-between">
        <span className="gtd-display text-2xl font-bold" style={{ color: "var(--accent)" }}>{number}</span>
        <button onClick={onClear} style={{ color: "var(--ink-soft)" }}><X size={14} /></button>
      </div>
      <span className="text-[14px] font-medium leading-tight">{task}</span>
    </div>
  );
}

function TodayView() {
  const [slots] = useState(["Approve pipe repair invoice", "Confirm building & pest inspection date", null]);
  const overdue = [{ title: "Follow up with Tara Cheyne's office", tag: "advocacy" }];
  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <p className="gtd-mono text-[11px] mb-1" style={{ color: "var(--ink-soft)" }}>MONDAY, 6 JULY</p>
        <h1 className="gtd-display text-xl font-bold">Today's three</h1>
      </div>
      <div className="flex gap-3 mb-8">
        {slots.map((s, i) => <PrioritySlot key={i} number={i + 1} task={s} onClear={() => {}} />)}
      </div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="gtd-mono text-[11px] font-semibold" style={{ color: "var(--ink-soft)" }}>ALSO DUE TODAY</h2>
      </div>
      <div className="gtd-card p-1 mb-6">
        {overdue.map((t, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <div className="gtd-checkbox" />
            <span className="flex-1 text-[14px]">{t.title}</span>
            <TagChip>{t.tag}</TagChip>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTaskForm({ projects, onAdd, onCancel }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id !== "inbox")?.id || "inbox");
  const [tag, setTag] = useState("");
  const [priority, setPriority] = useState(3);
  const [due, setDue] = useState("");
  const submit = () => {
    if (!title.trim()) return;
    onAdd(projectId, { id: "t" + Date.now(), title: title.trim(), tag: tag.trim() || "general", due: due.trim() || null, status: "next_action", priority });
  };
  return (
    <div className="gtd-card p-4 mb-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title…" className="gtd-input w-full mb-2" autoFocus />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="gtd-input">
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={due} onChange={(e) => setDue(e.target.value)} placeholder="Due (e.g. Fri)" className="gtd-input" />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (e.g. writing)" className="gtd-input" />
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((p) => (
            <button key={p} onClick={() => setPriority(p)} className="gtd-mono text-[11px] font-semibold px-2.5 py-2 border flex-1"
              style={{ borderColor: priority === p ? `var(--p${p})` : "var(--line)", background: priority === p ? `var(--p${p})` : "transparent", color: priority === p ? "var(--paper-raised)" : "var(--ink-soft)" }}>
              P{p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="gtd-mono text-[12px] px-3 py-1.5" style={{ color: "var(--ink-soft)" }}>Cancel</button>
        <button onClick={submit} className="gtd-mono text-[12px] px-3 py-1.5 font-semibold" style={{ background: "var(--ink)", color: "var(--paper)" }}>Add task</button>
      </div>
    </div>
  );
}

function SmartSearchBar({ search, setSearch, availableTags, activeTags, toggleTag, activePriorities, togglePriority, activeStatuses, toggleStatus, onClear, hasFilters }) {
  return (
    <div className="mb-3">
      <div className="gtd-card flex items-center gap-2 px-3 py-2 mb-2">
        <Search size={14} style={{ color: "var(--ink-soft)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, or filter by tag & priority below…" className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: "var(--ink)" }} />
        {hasFilters && <button onClick={onClear} className="gtd-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>Clear</button>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3].map((p) => (
          <button key={p} onClick={() => togglePriority(p)} className="gtd-mono gtd-tab px-2.5 py-1 text-[11px] font-semibold border"
            style={{ borderColor: activePriorities.has(p) ? `var(--p${p})` : "var(--line)", background: activePriorities.has(p) ? `var(--p${p})` : `var(--p${p}-soft)`, color: activePriorities.has(p) ? "var(--paper-raised)" : `var(--p${p})` }}>
            P{p}
          </button>
        ))}
        <span className="mx-1" style={{ width: 1, height: 16, background: "var(--line)" }} />
        {[["next_action", "Next"], ["waiting_on", "Waiting"]].map(([v, label]) => (
          <button key={v} onClick={() => toggleStatus(v)} className="gtd-mono gtd-tab px-2.5 py-1 text-[11px] font-medium border"
            style={{ borderColor: activeStatuses.has(v) ? "var(--ink)" : "var(--line)", background: activeStatuses.has(v) ? "var(--ink)" : "transparent", color: activeStatuses.has(v) ? "var(--paper)" : "var(--ink-soft)" }}>
            {label}
          </button>
        ))}
        <span className="mx-1" style={{ width: 1, height: 16, background: "var(--line)" }} />
        {availableTags.map((t) => (
          <button key={t} onClick={() => toggleTag(t)} className="gtd-mono gtd-tab px-2.5 py-1 text-[11px] font-medium border"
            style={{ borderColor: activeTags.has(t) ? "var(--teal)" : "var(--line)", background: activeTags.has(t) ? "var(--teal)" : "transparent", color: activeTags.has(t) ? "var(--paper)" : "var(--ink-soft)" }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function TasksView({ projects, addTask }) {
  const [mode, setMode] = useState("by_project");
  const [projectFilter, setProjectFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState(new Set());
  const [activePriorities, setActivePriorities] = useState(new Set());
  const [activeStatuses, setActiveStatuses] = useState(new Set());
  const [showAddTask, setShowAddTask] = useState(false);

  const toggleInSet = (setter) => (item) => setter((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });

  const allTasksFlat = useMemo(() => projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name }))), [projects]);
  const availableTags = useMemo(() => Array.from(new Set(allTasksFlat.map((t) => t.tag))).sort(), [allTasksFlat]);

  const matchesFilters = (t) => {
    if (search.trim() && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTags.size && !activeTags.has(t.tag)) return false;
    if (activePriorities.size && !(t.priority && activePriorities.has(t.priority))) return false;
    if (activeStatuses.size && !activeStatuses.has(t.status)) return false;
    return true;
  };

  const hasFilters = Boolean(search.trim() || activeTags.size || activePriorities.size || activeStatuses.size);
  const clearFilters = () => { setSearch(""); setActiveTags(new Set()); setActivePriorities(new Set()); setActiveStatuses(new Set()); };
  const projectsForByMode = projects.filter((p) => (projectFilter === "all" ? true : p.status === projectFilter));

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="gtd-display text-xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 gtd-card p-0.5">
            <button onClick={() => setMode("by_project")} className="gtd-mono text-[11px] font-medium px-2.5 py-1 rounded"
              style={{ background: mode === "by_project" ? "var(--ink)" : "transparent", color: mode === "by_project" ? "var(--paper)" : "var(--ink-soft)" }}>By project</button>
            <button onClick={() => setMode("all_tasks")} className="gtd-mono text-[11px] font-medium px-2.5 py-1 rounded"
              style={{ background: mode === "all_tasks" ? "var(--ink)" : "transparent", color: mode === "all_tasks" ? "var(--paper)" : "var(--ink-soft)" }}>All tasks</button>
          </div>
          <button onClick={() => setShowAddTask((s) => !s)} className="gtd-mono gtd-tab text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1" style={{ background: "var(--accent)", color: "var(--paper-raised)" }}>
            <Plus size={12} /> New task
          </button>
        </div>
      </div>

      {showAddTask && <AddTaskForm projects={projects} onAdd={(pid, data) => { addTask(pid, data); setShowAddTask(false); }} onCancel={() => setShowAddTask(false)} />}

      <SmartSearchBar
        search={search} setSearch={setSearch} availableTags={availableTags}
        activeTags={activeTags} toggleTag={toggleInSet(setActiveTags)}
        activePriorities={activePriorities} togglePriority={toggleInSet(setActivePriorities)}
        activeStatuses={activeStatuses} toggleStatus={toggleInSet(setActiveStatuses)}
        onClear={clearFilters} hasFilters={hasFilters}
      />

      {mode === "by_project" && (
        <>
          {!hasFilters && (
            <div className="flex gap-2 mb-3">
              {["active", "someday_maybe", "all"].map((f) => (
                <button key={f} onClick={() => setProjectFilter(f)} className="gtd-mono gtd-tab px-3 py-1 text-[11px] font-medium border"
                  style={{ borderColor: projectFilter === f ? "var(--ink)" : "var(--line)", background: projectFilter === f ? "var(--ink)" : "transparent", color: projectFilter === f ? "var(--paper)" : "var(--ink-soft)" }}>
                  {f === "someday_maybe" ? "someday" : f}
                </button>
              ))}
            </div>
          )}
          {!hasFilters && projectsForByMode.map((p) => <ProjectRow key={p.id} project={p} />)}
          {hasFilters && (() => {
            const results = projects.map((p) => ({ p, matched: p.tasks.filter(matchesFilters) })).filter((r) => r.matched.length > 0);
            if (results.length === 0) return <p className="text-[13px] p-3" style={{ color: "var(--ink-soft)" }}>No tasks match.</p>;
            return results.map(({ p, matched }) => (
              <div key={p.id} className="gtd-card mb-2 overflow-hidden">
                <div className="gtd-display font-semibold text-[14px] px-3 py-2 border-b" style={{ borderColor: "var(--line)" }}>{p.name}</div>
                <div className="px-3 pb-2">{matched.map((t) => <TaskRow key={t.id} task={t} />)}</div>
              </div>
            ));
          })()}
        </>
      )}

      {mode === "all_tasks" && (
        <div className="gtd-card p-1">
          {(() => {
            const results = allTasksFlat.filter(matchesFilters);
            if (results.length === 0) return <p className="text-[13px] p-3" style={{ color: "var(--ink-soft)" }}>No tasks match.</p>;
            return results.map((t) => <TaskRow key={t.id} task={t} projectName={t.projectName} />);
          })()}
        </div>
      )}
    </div>
  );
}

function AddProjectForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const submit = () => { if (!name.trim()) return; onAdd(name.trim(), status); };
  return (
    <div className="gtd-card p-3 mb-4 flex items-center gap-2 flex-wrap">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name…" className="gtd-input flex-1 min-w-[180px]" autoFocus />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="gtd-input">
        <option value="active">active</option>
        <option value="someday_maybe">someday</option>
      </select>
      <button onClick={onCancel} className="gtd-mono text-[12px] px-3 py-1.5" style={{ color: "var(--ink-soft)" }}>Cancel</button>
      <button onClick={submit} className="gtd-mono text-[12px] px-3 py-1.5 font-semibold" style={{ background: "var(--ink)", color: "var(--paper)" }}>Add</button>
    </div>
  );
}

function ProjectsView({ projects, addProject }) {
  const [expanded, setExpanded] = useState({});
  const [showAddProject, setShowAddProject] = useState(false);
  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));
  const tableProjects = projects.filter((p) => p.id !== "inbox");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="gtd-display text-xl font-bold">Projects</h1>
        <button onClick={() => setShowAddProject((s) => !s)} className="gtd-mono gtd-tab text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1" style={{ background: "var(--accent)", color: "var(--paper-raised)" }}>
          <Plus size={12} /> New project
        </button>
      </div>
      <p className="text-[13px] mb-4" style={{ color: "var(--ink-soft)" }}>
        Scroll right for a project's history over time. Scroll down for a snapshot of everything, one week. Click a cell to expand it. <span className="gtd-mono">(Desktop-oriented view — not optimised for mobile.)</span>
      </p>

      {showAddProject && <AddProjectForm onAdd={(name, status) => { addProject(name, status); setShowAddProject(false); }} onCancel={() => setShowAddProject(false)} />}

      <div className="overflow-auto gtd-scrollbar gtd-card" style={{ maxHeight: 480 }}>
        <table className="gtd-history-table w-full text-[13px]">
          <thead>
            <tr>
              <th className="gtd-display sticky left-0 top-0 z-20 text-left px-3 py-2 font-semibold text-[13px]" style={{ background: "var(--paper-raised)", minWidth: 220 }}>Project</th>
              {historyWeeks.map((w, i) => (
                <th key={w} className="gtd-mono sticky top-0 z-10 text-left px-3 py-2 font-semibold text-[11px]"
                  style={{ background: i === historyWeeks.length - 1 ? "var(--accent-soft)" : "var(--paper-raised)", color: i === historyWeeks.length - 1 ? "var(--accent)" : "var(--ink-soft)", minWidth: 200 }}>
                  {w}{i === historyWeeks.length - 1 ? " · current" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableProjects.map((p) => (
              <tr key={p.id}>
                <td className="gtd-display sticky left-0 z-10 px-3 py-2.5 font-semibold text-[13px]" style={{ background: "var(--paper-raised)" }}>{p.name}</td>
                {historyWeeks.map((w, i) => {
                  const key = `${p.id}-${i}`;
                  const isCurrent = i === historyWeeks.length - 1;
                  const note = p.weeklyNotes[w] || "—";
                  return (
                    <td key={key} onClick={() => toggle(key)} className="px-3 py-2.5 align-top"
                      style={{ background: isCurrent ? "var(--accent-soft)" : "transparent", color: note === "—" ? "var(--ink-soft)" : "var(--ink)" }}>
                      <span className={`gtd-hcell ${expanded[key] ? "expanded" : ""}`}>{note}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewView({ projects }) {
  const [priorities, setPriorities] = useState({});
  const togglePriority = (id) => {
    setPriorities((prev) => {
      const count = Object.values(prev).filter(Boolean).length;
      if (!prev[id] && count >= 3) return prev;
      return { ...prev, [id]: !prev[id] };
    });
  };
  const priorityCount = Object.values(priorities).filter(Boolean).length;
  const activeProjects = projects.filter((p) => p.status === "active" && p.id !== "inbox");
  const allActionable = activeProjects.flatMap((p) => p.tasks.filter((t) => t.status !== "done").map((t) => ({ ...t, projectName: p.name })));

  return (
    <div className="p-4 pb-24">
      <h1 className="gtd-display text-xl font-bold mb-1">Weekly review</h1>
      <p className="gtd-mono text-[11px] mb-6" style={{ color: "var(--ink-soft)" }}>4-week streak · last completed Mon 22 Jun</p>

      <h2 className="gtd-mono text-[11px] font-semibold mb-2" style={{ color: "var(--accent)" }}>1 · GET CLEAR</h2>
      <div className="gtd-card p-4 mb-6">
        <label className="flex items-center gap-3 py-2 text-[14px]"><div className="gtd-checkbox" /> Inbox processed to zero</label>
        <label className="flex items-center gap-3 py-2 text-[14px] border-t" style={{ borderColor: "var(--line)" }}><div className="gtd-checkbox" /> Loose open loops captured</label>
        <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
          <Plus size={14} style={{ color: "var(--ink-soft)" }} />
          <input placeholder="Quick capture something you just remembered…" className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: "var(--ink)" }} />
        </div>
      </div>

      <h2 className="gtd-mono text-[11px] font-semibold mb-2" style={{ color: "var(--accent)" }}>2 · REVIEW PROJECTS</h2>
      <div className="mb-6 space-y-3">
        {activeProjects.map((p) => (
          <div key={p.id} className="gtd-card p-4">
            <h3 className="gtd-display font-semibold text-[15px] mb-2">{p.name}</h3>
            <textarea defaultValue={p.notes} rows={2} className="w-full text-[13px] bg-transparent outline-none border p-2 mb-2"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }} placeholder="Any update? What's the state of this project?" />
            {p.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
            <div className="mt-2 pt-2 flex items-center gap-2">
              <Plus size={14} style={{ color: "var(--ink-soft)" }} />
              <input placeholder="Add a next action…" className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: "var(--ink)" }} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="gtd-mono text-[11px] font-semibold mb-2" style={{ color: "var(--accent)" }}>
        3 · SET WEEKLY PRIORITIES <span style={{ color: "var(--ink-soft)" }}>({priorityCount}/3 selected)</span>
      </h2>
      <div className="gtd-card p-1 mb-6">
        {allActionable.map((t) => {
          const disabled = !priorities[t.id] && priorityCount >= 3;
          return (
            <label key={t.id} className="flex items-center gap-3 py-2.5 px-2 border-b text-[14px]" style={{ borderColor: "var(--line)", opacity: disabled ? 0.4 : 1 }}>
              <button onClick={() => !disabled && togglePriority(t.id)} className={`gtd-checkbox flex items-center justify-center ${priorities[t.id] ? "done" : ""}`}>
                {priorities[t.id] && <Check size={12} color="var(--paper-raised)" strokeWidth={3} />}
              </button>
              <Flag size={12} style={{ color: "var(--ink-soft)" }} />
              <PriorityBadge priority={t.priority} />
              <span className="flex-1">{t.title}</span>
              <span className="gtd-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>{t.projectName}</span>
            </label>
          );
        })}
      </div>

      <h2 className="gtd-mono text-[11px] font-semibold mb-2" style={{ color: "var(--accent)" }}>4 · REFLECTION</h2>
      <div className="gtd-card p-4 mb-6">
        <textarea rows={3} className="w-full text-[13px] bg-transparent outline-none" style={{ color: "var(--ink)" }} placeholder="How did this week actually go?" />
      </div>

      <button className="gtd-mono gtd-tab text-[13px] px-5 py-3 font-semibold w-full" style={{ background: "var(--ink)", color: "var(--paper)" }}>Finish review</button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("today");
  const [projects, setProjects] = useState(seedProjects);
  const isWide = view === "projects";

  const addProject = (name, status) => {
    setProjects((prev) => [...prev, { id: "p" + Date.now(), name, status, notes: "", weeklyNotes: {}, tasks: [] }]);
  };
  const addTask = (projectId, taskData) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, tasks: [...p.tasks, taskData] } : p)));
  };

  const navItems = [
    { id: "today", label: "Today", icon: Circle },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "projects", label: "Projects", icon: Grid3x3 },
    { id: "review", label: "Review", icon: RefreshCw },
  ];

  return (
    <div className="gtd-app min-h-[700px] mx-auto relative" style={{ maxWidth: isWide ? 900 : 420, transition: "max-width 0.15s" }}>
      <style>{TOKENS}</style>
      <div className="overflow-y-auto gtd-scrollbar" style={{ maxHeight: 700 }}>
        {view === "today" && <TodayView />}
        {view === "tasks" && <TasksView projects={projects} addTask={addTask} />}
        {view === "projects" && <ProjectsView projects={projects} addProject={addProject} />}
        {view === "review" && <ReviewView projects={projects} />}
      </div>
      <div className="sticky bottom-0 left-0 right-0 flex items-center justify-around py-3 border-t" style={{ background: "var(--paper-raised)", borderColor: "var(--line)" }}>
        {navItems.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => setView(n.id)} className="flex flex-col items-center gap-1">
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} color={active ? "var(--accent)" : "var(--ink-soft)"} />
              <span className="gtd-mono text-[10px] font-medium" style={{ color: active ? "var(--accent)" : "var(--ink-soft)" }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
