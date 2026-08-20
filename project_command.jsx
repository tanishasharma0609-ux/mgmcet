import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard, ListChecks, Users, CalendarClock, Plus, Trash2, X, Pencil, Check
} from "lucide-react";

const STORAGE_KEY = "project-command-workspace-v3";
const MEMBER_COLORS = ["#2563EB", "#DC2626", "#16A34A", "#D97706", "#7C3AED", "#0891B2"];

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const STATUSES = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function seedData() {
  const today = new Date();
  const d = (offset) => {
    const nd = new Date(today);
    nd.setDate(nd.getDate() + offset);
    return nd.toISOString().slice(0, 10);
  };
  const members = [
    { id: uid(), name: "Priya Nair", role: "Research Lead", color: MEMBER_COLORS[0] },
    { id: uid(), name: "Diego Marín", role: "Design", color: MEMBER_COLORS[1] },
    { id: uid(), name: "Aisha Bello", role: "Development", color: MEMBER_COLORS[2] },
    { id: uid(), name: "Sam Whitfield", role: "Writer / Editor", color: MEMBER_COLORS[3] },
  ];
  const tasks = [
    { id: uid(), title: "Literature review draft", description: "Summarize 10 core sources for the lit review section.", assigneeId: members[0].id, dueDate: d(-2), priority: "high", status: "inprogress" },
    { id: uid(), title: "Survey design", description: "Draft the 12-question student survey.", assigneeId: members[0].id, dueDate: d(1), priority: "medium", status: "todo" },
    { id: uid(), title: "Wireframes for app screens", description: "Low-fi wireframes for onboarding + dashboard.", assigneeId: members[1].id, dueDate: d(3), priority: "high", status: "inprogress" },
    { id: uid(), title: "Brand palette + type system", description: "Lock the visual identity before high-fi mocks.", assigneeId: members[1].id, dueDate: d(-6), priority: "low", status: "done" },
    { id: uid(), title: "Set up repo + CI", description: "Init repo, linting, basic build pipeline.", assigneeId: members[2].id, dueDate: d(-4), priority: "medium", status: "done" },
    { id: uid(), title: "Build task API prototype", description: "Basic CRUD endpoints for tasks.", assigneeId: members[2].id, dueDate: d(5), priority: "high", status: "todo" },
    { id: uid(), title: "Outline final report", description: "Section-by-section skeleton for the write-up.", assigneeId: members[3].id, dueDate: d(2), priority: "medium", status: "todo" },
    { id: uid(), title: "Proofread proposal", description: "Pass for grammar and consistency before submission.", assigneeId: members[3].id, dueDate: d(-1), priority: "high", status: "todo" },
  ];
  return { projectName: "Campus Sustainability App", courseName: "CS 402 — Senior Capstone", overallDueDate: d(21), members, tasks };
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - now) / 86400000);
}
function dueTone(dateStr, status) {
  if (status === "done") return "done";
  const n = daysUntil(dateStr);
  if (n < 0) return "overdue";
  if (n <= 2) return "soon";
  return "ok";
}
const TONE_COLOR = { overdue: "#DC2626", soon: "#D97706", ok: "#6B7280", done: "#16A34A" };
function dueLabel(dateStr, status) {
  const n = daysUntil(dateStr);
  if (status === "done") return "Done";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "Due today";
  return `Due in ${n}d`;
}
function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProjectCommand() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        setData(res && res.value ? JSON.parse(res.value) : seedData());
      } catch (e) {
        setData(seedData());
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(data), false); } catch (e) {}
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

  const addTask = useCallback((task) => setData((p) => ({ ...p, tasks: [...p.tasks, { id: uid(), ...task }] })), []);
  const updateTask = useCallback((id, patch) => setData((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })), []);
  const deleteTask = useCallback((id) => setData((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) })), []);
  const addMember = useCallback((member) => setData((p) => ({ ...p, members: [...p.members, { id: uid(), color: MEMBER_COLORS[p.members.length % MEMBER_COLORS.length], ...member }] })), []);
  const deleteMember = useCallback((id) => setData((p) => ({ ...p, members: p.members.filter((m) => m.id !== id), tasks: p.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: null } : t)) })), []);
  const updateMeta = useCallback((patch) => setData((p) => ({ ...p, ...patch })), []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { tasks, members } = data;
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inprogress = tasks.filter((t) => t.status === "inprogress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const overdue = tasks.filter((t) => t.status !== "done" && daysUntil(t.dueDate) < 0).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, inprogress, todo, overdue, pct, members: members.length };
  }, [data]);

  if (!loaded || !data || !stats) {
    return <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B7280" }}>Loading workspace…</div>;
  }

  const memberById = Object.fromEntries(data.members.map((m) => [m.id, m]));
  const dLeft = daysUntil(data.overallDueDate);

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "team", label: "Team", icon: Users },
    { id: "timeline", label: "Deadlines", icon: CalendarClock },
  ];

  return (
    <div className="pc-app">
      <GlobalStyle />

      <header className="pc-header">
        <div className="pc-header-top">
          {editingMeta ? (
            <MetaEditor data={data} onSave={(p) => { updateMeta(p); setEditingMeta(false); }} onCancel={() => setEditingMeta(false)} />
          ) : (
            <>
              <div>
                <div className="pc-title-row">
                  <h1 className="pc-title">{data.projectName}</h1>
                  <button className="pc-icon-btn" onClick={() => setEditingMeta(true)} aria-label="Edit project"><Pencil size={13} /></button>
                </div>
                <p className="pc-subtitle">{data.courseName}</p>
              </div>
              <div className="pc-due-info">
                <span className="pc-due-text" style={{ color: dLeft < 0 ? TONE_COLOR.overdue : "inherit" }}>
                  {dLeft < 0 ? `${Math.abs(dLeft)} days overdue` : `${dLeft} days left`}
                </span>
                <span className="pc-due-caption">Final deadline · {data.overallDueDate}</span>
              </div>
            </>
          )}
        </div>

        <div className="pc-progress-row">
          <div className="pc-progress-track"><div className="pc-progress-fill" style={{ width: `${stats.pct}%` }} /></div>
          <span className="pc-progress-pct">{stats.pct}% complete</span>
        </div>

        <nav className="pc-tabs">
          {NAV.map((tab) => (
            <button key={tab.id} className={`pc-tab ${activeTab === tab.id ? "pc-tab-active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={15} strokeWidth={2} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="pc-main">
        {activeTab === "dashboard" && <Dashboard data={data} stats={stats} memberById={memberById} setActiveTab={setActiveTab} />}
        {activeTab === "tasks" && (
          <TasksBoard data={data} memberById={memberById} updateTask={updateTask} deleteTask={deleteTask}
            showForm={showTaskForm} setShowForm={setShowTaskForm} addTask={addTask} />
        )}
        {activeTab === "team" && (
          <TeamPanel data={data} addMember={addMember} deleteMember={deleteMember} showForm={showMemberForm} setShowForm={setShowMemberForm} />
        )}
        {activeTab === "timeline" && <Timeline data={data} memberById={memberById} />}
      </main>
    </div>
  );
}

function MetaEditor({ data, onSave, onCancel }) {
  const [name, setName] = useState(data.projectName);
  const [course, setCourse] = useState(data.courseName);
  const [due, setDue] = useState(data.overallDueDate);
  return (
    <div className="pc-meta-editor">
      <input className="pc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
      <input className="pc-input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course / context" />
      <input type="date" className="pc-input" value={due} onChange={(e) => setDue(e.target.value)} />
      <button className="pc-btn pc-btn-primary" onClick={() => onSave({ projectName: name || "Untitled Project", courseName: course, overallDueDate: due })}><Check size={14} /> Save</button>
      <button className="pc-btn pc-btn-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }

      :root {
        --bg: #FAFAFA;
        --surface: #FFFFFF;
        --border: #E5E7EB;
        --text: #111827;
        --muted: #6B7280;
        --accent: #2563EB;
        --accent-soft: #EFF4FF;
        --danger: #DC2626;
        --warn: #D97706;
        --good: #16A34A;
        --radius: 8px;
      }

      .pc-app { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100%; font-size: 14px; line-height: 1.5; }

      .pc-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 24px 32px 0; }
      .pc-header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; max-width: 980px; margin: 0 auto; }
      .pc-title-row { display: flex; align-items: center; gap: 8px; }
      .pc-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
      .pc-subtitle { font-size: 13px; color: var(--muted); margin: 4px 0 0; }
      .pc-icon-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 5px; display: flex; }
      .pc-icon-btn:hover { background: var(--bg); color: var(--text); }

      .pc-due-info { text-align: right; }
      .pc-due-text { font-size: 15px; font-weight: 600; display: block; }
      .pc-due-caption { font-size: 12px; color: var(--muted); }

      .pc-meta-editor { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; width: 100%; max-width: 980px; margin: 0 auto; }
      .pc-meta-editor .pc-input { max-width: 220px; }

      .pc-progress-row { display: flex; align-items: center; gap: 12px; max-width: 980px; margin: 16px auto 0; }
      .pc-progress-track { flex: 1; height: 6px; background: var(--border); border-radius: 20px; overflow: hidden; }
      .pc-progress-fill { height: 100%; background: var(--accent); border-radius: 20px; transition: width 0.4s ease; }
      .pc-progress-pct { font-size: 12.5px; color: var(--muted); font-weight: 500; white-space: nowrap; }

      .pc-tabs { display: flex; gap: 4px; max-width: 980px; margin: 18px auto 0; overflow-x: auto; }
      .pc-tab {
        display: flex; align-items: center; gap: 7px; padding: 10px 4px; margin-right: 22px;
        font-size: 13.5px; font-weight: 500; color: var(--muted); background: none; border: none;
        border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap;
      }
      .pc-tab:hover { color: var(--text); }
      .pc-tab-active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }

      .pc-main { max-width: 980px; margin: 0 auto; padding: 28px 32px 60px; }

      .pc-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
      .pc-section-title { font-size: 16px; font-weight: 700; margin: 0; }
      .pc-section-sub { font-size: 12.5px; color: var(--muted); margin: 2px 0 0; }

      .pc-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }

      .pc-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 24px; }
      .pc-stat { background: var(--surface); padding: 16px 18px; }
      .pc-stat-value { font-size: 24px; font-weight: 700; line-height: 1.1; }
      .pc-stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; display: block; }

      .pc-label { font-size: 12px; font-weight: 600; color: var(--text); margin: 0 0 12px; }

      .pc-btn {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
        padding: 8px 14px; border-radius: var(--radius); border: 1px solid var(--border); cursor: pointer;
        background: var(--surface); color: var(--text);
      }
      .pc-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
      .pc-btn-primary:hover { background: #1D4ED8; }
      .pc-btn-ghost:hover { background: var(--bg); }
      .pc-btn-plain { background: none; border: none; color: var(--muted); padding: 4px; cursor: pointer; }
      .pc-btn-plain:hover { color: var(--danger); }

      .pc-input, .pc-select, .pc-textarea {
        width: 100%; font-family: 'Inter', sans-serif; font-size: 13.5px; padding: 8px 10px;
        border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text);
      }
      .pc-input:focus, .pc-select:focus, .pc-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
      .pc-field-label { font-size: 12px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 5px; }
      .pc-textarea { resize: vertical; }

      .pc-avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; flex-shrink: 0; width: 26px; height: 26px; font-size: 10.5px; }

      .pc-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
      .pc-row + .pc-row { border-top: 1px solid var(--border); }

      .pc-task { padding: 14px 16px; border-bottom: 1px solid var(--border); }
      .pc-task:last-child { border-bottom: none; }
      .pc-task-title { font-size: 13.5px; font-weight: 600; }
      .pc-task-desc { font-size: 12.5px; color: var(--muted); margin: 4px 0 0; }
      .pc-task-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px; }

      .pc-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
      .pc-empty { padding: 32px 20px; text-align: center; color: var(--muted); font-size: 13px; }

      @media (max-width: 640px) {
        .pc-header { padding: 20px 18px 0; }
        .pc-main { padding: 22px 18px 48px; }
        .pc-header-top { flex-direction: column; }
        .pc-due-info { text-align: left; }
      }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    `}</style>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="pc-stat">
      <div className="pc-stat-value">{value}</div>
      <span className="pc-stat-label">{label}</span>
    </div>
  );
}
function EmptyNote({ text }) { return <div className="pc-empty">{text}</div>; }

function Dashboard({ data, stats, memberById, setActiveTab }) {
  const upcoming = [...data.tasks].filter((t) => t.status !== "done").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
  const memberProgress = data.members.map((m) => {
    const mine = data.tasks.filter((t) => t.assigneeId === m.id);
    const done = mine.filter((t) => t.status === "done").length;
    return { ...m, total: mine.length, done, pct: mine.length ? Math.round((done / mine.length) * 100) : 0 };
  });

  return (
    <div>
      <div className="pc-stat-grid">
        <StatBlock label="Total tasks" value={stats.total} />
        <StatBlock label="Completed" value={stats.done} />
        <StatBlock label="In progress" value={stats.inprogress} />
        <StatBlock label="Overdue" value={stats.overdue} />
        <StatBlock label="Team members" value={stats.members} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <div className="pc-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 className="pc-label" style={{ margin: 0 }}>Upcoming deadlines</h3>
            <button className="pc-btn pc-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setActiveTab("timeline")}>View all</button>
          </div>
          {upcoming.length === 0 ? <EmptyNote text="Nothing due — everything is finished or unscheduled." /> : (
            <div>
              {upcoming.map((t) => {
                const tone = dueTone(t.dueDate, t.status);
                const m = memberById[t.assigneeId];
                return (
                  <div key={t.id} className="pc-row">
                    <span className="pc-dot" style={{ background: TONE_COLOR[tone] }} />
                    <span style={{ fontSize: 13.5, flex: 1 }}>{t.title}</span>
                    {m && <span className="pc-avatar" style={{ background: m.color }}>{initials(m.name)}</span>}
                    <span style={{ fontSize: 12.5, color: TONE_COLOR[tone], minWidth: 90, textAlign: "right" }}>{dueLabel(t.dueDate, t.status)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pc-card" style={{ padding: 20 }}>
          <h3 className="pc-label">Team progress</h3>
          {memberProgress.length === 0 ? <EmptyNote text="Add teammates from the Team tab to track progress." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {memberProgress.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="pc-avatar" style={{ background: m.color }}>{initials(m.name)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ color: "var(--muted)" }}>{m.done}/{m.total} tasks</span>
                    </div>
                    <div className="pc-progress-track"><div className="pc-progress-fill" style={{ width: `${m.pct}%`, background: m.color }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, member, onStatusChange, onDelete }) {
  const tone = dueTone(task.dueDate, task.status);
  const priorityColor = task.priority === "high" ? TONE_COLOR.overdue : task.priority === "medium" ? TONE_COLOR.soon : "var(--muted)";
  return (
    <div className="pc-task">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span className="pc-task-title">{task.title}</span>
        <button onClick={() => onDelete(task.id)} className="pc-btn-plain" aria-label="Delete task"><Trash2 size={13} /></button>
      </div>
      {task.description && <p className="pc-task-desc">{task.description}</p>}
      <div className="pc-task-meta">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {member ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              <span className="pc-avatar" style={{ background: member.color, width: 20, height: 20, fontSize: 9 }}>{initials(member.name)}</span>
              {member.name}
            </span>
          ) : <span style={{ fontSize: 12, color: "var(--muted)" }}>Unassigned</span>}
          <span style={{ fontSize: 11.5, color: priorityColor, fontWeight: 600 }}>
            {task.priority === "high" ? "High priority" : task.priority === "medium" ? "Medium priority" : "Low priority"}
          </span>
        </div>
        <span style={{ fontSize: 12, color: TONE_COLOR[tone], fontWeight: 500 }}>{dueLabel(task.dueDate, task.status)}</span>
      </div>
      <select className="pc-select" style={{ marginTop: 10, fontSize: 12, padding: "6px 8px" }} value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value)}>
        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

function TasksBoard({ data, memberById, updateTask, deleteTask, showForm, setShowForm, addTask }) {
  const grouped = STATUSES.map((s) => ({ ...s, tasks: data.tasks.filter((t) => t.status === s.id) }));
  return (
    <div>
      <div className="pc-section-head">
        <div>
          <h2 className="pc-section-title">Tasks</h2>
          <p className="pc-section-sub">Everything the team needs to get done.</p>
        </div>
        <button className="pc-btn pc-btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> New task</button>
      </div>

      {showForm && <TaskForm members={data.members} onCancel={() => setShowForm(false)} onSubmit={(t) => { addTask(t); setShowForm(false); }} />}

      {data.tasks.length === 0 ? <div className="pc-card"><EmptyNote text="No tasks yet. Add the first one to start tracking your project." /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {grouped.map((col) => (
            <div key={col.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{col.label}</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{col.tasks.length}</span>
              </div>
              <div className="pc-card">
                {col.tasks.length === 0 ? <EmptyNote text="Nothing here" /> : (
                  col.tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map((t) => (
                    <TaskRow key={t.id} task={t} member={memberById[t.assigneeId]} onStatusChange={(id, status) => updateTask(id, { status })} onDelete={deleteTask} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskForm({ members, onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(members[0]?.id || "");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), assigneeId: assigneeId || null, dueDate, priority, status });
  };

  return (
    <form onSubmit={submit} className="pc-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>New task</h3>
        <button type="button" onClick={onCancel} className="pc-icon-btn" aria-label="Close"><X size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="pc-field-label">Title</label>
          <input className="pc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft methodology section" required />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="pc-field-label">Description (optional)</label>
          <textarea className="pc-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any extra detail teammates should know" />
        </div>
        <div>
          <label className="pc-field-label">Assignee</label>
          <select className="pc-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="pc-field-label">Due date</label>
          <input type="date" className="pc-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div>
          <label className="pc-field-label">Priority</label>
          <select className="pc-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="pc-field-label">Status</label>
          <select className="pc-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <button type="button" className="pc-btn pc-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pc-btn pc-btn-primary"><Plus size={13} /> Add task</button>
      </div>
    </form>
  );
}

function TeamPanel({ data, addMember, deleteMember, showForm, setShowForm }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMember({ name: name.trim(), role: role.trim() || "Contributor" });
    setName(""); setRole(""); setShowForm(false);
  };

  return (
    <div>
      <div className="pc-section-head">
        <div>
          <h2 className="pc-section-title">Team</h2>
          <p className="pc-section-sub">Everyone working on this project.</p>
        </div>
        <button className="pc-btn pc-btn-primary" onClick={() => setShowForm((v) => !v)}><Plus size={14} /> Add member</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="pc-card" style={{ padding: 18, marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="pc-field-label">Name</label>
            <input className="pc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="pc-field-label">Role</label>
            <input className="pc-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Design, Research" />
          </div>
          <button type="submit" className="pc-btn pc-btn-primary"><Plus size={13} /> Add</button>
          <button type="button" className="pc-btn pc-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      {data.members.length === 0 ? <div className="pc-card"><EmptyNote text="No teammates yet — add your group members to start assigning tasks." /></div> : (
        <div className="pc-card">
          {data.members.map((m) => {
            const mine = data.tasks.filter((t) => t.assigneeId === m.id);
            const done = mine.filter((t) => t.status === "done").length;
            const overdue = mine.filter((t) => t.status !== "done" && daysUntil(t.dueDate) < 0).length;
            return (
              <div key={m.id} className="pc-row" style={{ padding: "14px 16px" }}>
                <span className="pc-avatar" style={{ background: m.color, width: 34, height: 34, fontSize: 12.5 }}>{initials(m.name)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.role}</div>
                </div>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{done}/{mine.length} done</span>
                {overdue > 0 && <span style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>{overdue} overdue</span>}
                <button onClick={() => deleteMember(m.id)} className="pc-btn-plain" aria-label={`Remove ${m.name}`}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Timeline({ data, memberById }) {
  const sorted = [...data.tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const groups = {};
  sorted.forEach((t) => {
    const tone = dueTone(t.dueDate, t.status);
    const label = tone === "overdue" ? "Overdue" : tone === "done" ? "Completed" : tone === "soon" ? "Due soon" : "Upcoming";
    groups[label] = groups[label] || [];
    groups[label].push(t);
  });
  const order = ["Overdue", "Due soon", "Upcoming", "Completed"];
  const labelTone = { Overdue: "overdue", "Due soon": "soon", Upcoming: "ok", Completed: "done" };

  return (
    <div>
      <div className="pc-section-head">
        <div>
          <h2 className="pc-section-title">Deadlines</h2>
          <p className="pc-section-sub">Every task, sorted by urgency.</p>
        </div>
      </div>
      {data.tasks.length === 0 ? <div className="pc-card"><EmptyNote text="No deadlines to show yet — add tasks with due dates from the Tasks tab." /></div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {order.filter((label) => groups[label]?.length).map((label) => (
            <div key={label}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span className="pc-dot" style={{ background: TONE_COLOR[labelTone[label]] }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{groups[label].length}</span>
              </div>
              <div className="pc-card">
                {groups[label].map((t) => {
                  const m = memberById[t.assigneeId];
                  const tone = dueTone(t.dueDate, t.status);
                  return (
                    <div key={t.id} className="pc-row" style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)", width: 90 }}>{t.dueDate}</span>
                      <span style={{ fontSize: 13.5, flex: 1 }}>{t.title}</span>
                      {m && <span className="pc-avatar" style={{ background: m.color, width: 22, height: 22, fontSize: 9.5 }}>{initials(m.name)}</span>}
                      <span style={{ fontSize: 12, color: TONE_COLOR[tone], fontWeight: 500, minWidth: 80, textAlign: "right" }}>{dueLabel(t.dueDate, t.status)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
