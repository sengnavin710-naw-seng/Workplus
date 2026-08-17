"use client";

import { Button } from "@repo/ui/button";
import { DashboardShell } from "../dashboard-shell";
import { Code2, DollarSign, Folder, Globe2, Monitor, MoreHorizontal, Plus, Search, UsersRound, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MemberStatus = "active" | "idle" | "offline" | "break";
interface Member { id: string; name: string; role: string; initials: string; color: string; status: MemberStatus; util: number }
interface Team { id: string; name: string; description: string; color: string; icon: LucideIcon; iconKey: string; goal: number; utilization: number; workTime: string; members: Member[] }
interface TeamsPageProps { organizationName: string; role: string; userEmail: string; userName: string }
interface TeamApiItem { id: string; name: string; description: string; color: string; icon: string; utilizationGoal: number; members: Array<{ id: string; name: string; role: string; status: "pending" | "active" | "archived" }> }
interface EmployeeOption { id: string; name: string; email: string | null; role: string; status: "pending" | "active" | "archived" }
interface TeamsApiResponse { teams: TeamApiItem[]; employees: EmployeeOption[]; message?: string }

const palette = ["#6c5ecf", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#14b8a6", "#0ea5e9", "#ef4444", "#f97316", "#84cc16"];
const iconOptions: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Code", icon: Code2 },
  { label: "Globe", icon: Globe2 },
  { label: "Folder", icon: Folder },
  { label: "Finance", icon: DollarSign },
  { label: "Monitor", icon: Monitor },
  { label: "People", icon: UsersRound },
];
const iconByKey: Record<string, LucideIcon> = { code: Code2, globe: Globe2, folder: Folder, finance: DollarSign, monitor: Monitor, people: UsersRound };
const iconKeys = ["code", "globe", "folder", "finance", "monitor", "people"];
function mapTeam(item: TeamApiItem): Team { return { id: item.id, name: item.name, description: item.description, color: item.color, iconKey: item.icon, icon: iconByKey[item.icon] ?? UsersRound, goal: item.utilizationGoal, utilization: 0, workTime: "0h 00m", members: item.members.map((member) => ({ id: member.id, name: member.name, role: member.role, initials: member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: item.color, status: "offline", util: 0 })) }; }

const statusLabel: Record<MemberStatus, string> = { active: "Active", idle: "Idle", offline: "Offline", break: "On Break" };

function utilizationClass(value: number) { return value >= 75 ? "bg-violet-600" : value >= 50 ? "bg-amber-500" : "bg-red-500"; }
function statusClass(status: MemberStatus) { return status === "active" ? "bg-emerald-50 text-emerald-700" : status === "idle" ? "bg-amber-50 text-amber-700" : status === "break" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"; }

export function TeamsPage({ organizationName, role, userEmail, userName }: TeamsPageProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerTeam, setDrawerTeam] = useState<Team | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "members" | "settings">("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isAssigningMember, setIsAssigningMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", description: "New team", color: palette[0] ?? "#6c5ecf", iconIndex: 0, goal: "75" });

  const refreshTeams = useCallback(async () => {
    const response = await fetch("/api/teams", { cache: "no-store" });
    const result = (await response.json().catch(() => null)) as TeamsApiResponse | null;
    if (!response.ok || !result?.teams) throw new Error(result?.message ?? "Unable to load teams");
    const refreshed = result.teams.map(mapTeam);
    setTeams(refreshed);
    setEmployees(result.employees ?? []);
    setDrawerTeam((current) => current ? refreshed.find((team) => team.id === current.id) ?? null : null);
    setPageError("");
  }, []);

  useEffect(() => { void refreshTeams().catch((error: unknown) => setPageError(error instanceof Error ? error.message : "Unable to load teams")).finally(() => setIsLoading(false)); }, [refreshTeams]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teams.filter((team) => !query || `${team.name} ${team.description}`.toLowerCase().includes(query));
  }, [search, teams]);
  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0);

  async function createTeam() {
    setNotice("");
    setPageError("");
    const name = form.name.trim();
    const goal = Math.min(100, Math.max(0, Number(form.goal) || 75));
    if (!name) { setFormError("Enter a team name."); return; }
    setIsSaving(true);
    try {
      const response = await fetch(editingTeamId ? `/api/teams/${editingTeamId}` : "/api/teams", { method: editingTeamId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: form.description.trim(), color: form.color, icon: iconKeys[form.iconIndex] ?? "people", utilizationGoal: goal }) });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) { setFormError(result?.message ?? "Unable to create team"); return; }
      await refreshTeams();
      setForm({ name: "", description: "New team", color: palette[0] ?? "#6c5ecf", iconIndex: 0, goal: "75" }); setEditingTeamId(null); setFormError(""); setIsModalOpen(false);
      setNotice(editingTeamId ? "Team updated." : "Team created.");
    } catch {
      setFormError("Unable to save the team. Try again.");
    } finally { setIsSaving(false); }
  }

  function editTeam(team: Team) {
    setEditingTeamId(team.id);
    setForm({ name: team.name, description: team.description, color: team.color, iconIndex: Math.max(0, iconKeys.indexOf(team.iconKey)), goal: String(team.goal) });
    setFormError(""); setIsModalOpen(true); setOpenMenu(null);
  }

  async function deleteTeam(id: string) {
    setNotice("");
    setDeleteError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) { setDeleteError(result?.message ?? "Unable to delete team"); return; }
      setDrawerTeam(null); setOpenMenu(null); setDeleteTarget(null); await refreshTeams(); setNotice("Team deleted.");
    } catch {
      setDeleteError("Unable to delete team. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function assignMember() {
    if (!addMemberTeam || !selectedEmployeeId) return;
    setIsAssigningMember(true);
    setMemberError("");
    try {
      const response = await fetch(`/api/employees/${selectedEmployeeId}/team`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: addMemberTeam.id }) });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) { setMemberError(result?.message ?? "Unable to add member"); return; }
      await refreshTeams(); setAddMemberTeam(null); setSelectedEmployeeId(""); setNotice("Employee assigned to team.");
    } catch {
      setMemberError("Unable to assign the employee. Try again.");
    } finally { setIsAssigningMember(false); }
  }

  function exportTeams() {
    setNotice("");
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [["Team", "Description", "Members", "Utilization goal"], ...filteredTeams.map((team) => [team.name, team.description, team.members.length, `${team.goal}%`])];
    const blob = new Blob(["\uFEFF", rows.map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "workplus-teams.csv"; link.click(); URL.revokeObjectURL(url); setNotice("Teams exported.");
  }

  return <DashboardShell activeNav="Teams" headerAction={<button className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950" onClick={() => { setEditingTeamId(null); setIsModalOpen(true); }} type="button"><Plus aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Add Team</span><span className="sm:hidden">Add</span></button>} organizationName={organizationName} role={role} title="Teams" userEmail={userEmail} userName={userName}>
    {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{pageError}</p> : null}
    {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{notice}</p> : null}
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-slate-500">Organize people, coverage, and team goals in one place.</p>
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto"><label className="relative min-w-0 flex-1 sm:w-60"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><span className="sr-only">Search teams</span><input aria-label="Search teams" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" onChange={(event) => setSearch(event.target.value)} placeholder="Search teams..." value={search} /></label><button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!filteredTeams.length} onClick={exportTeams} type="button">Export</button></div>
    </div>
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500"><span><strong className="font-semibold text-slate-900">{teams.length}</strong> teams</span><span aria-hidden="true" className="h-4 w-px bg-slate-200" /><span><strong className="font-semibold text-slate-900">{totalMembers}</strong> members</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Operational metrics arrive after Phase 3 collection and Phase 4 aggregation</span></div>
    {isLoading ? <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading teams…</div> : filteredTeams.length ? <div className="grid gap-[18px] xl:grid-cols-3">{filteredTeams.map((team, index) => <TeamCard index={index} key={team.id} onDelete={(team) => setDeleteTarget(team)} onEdit={editTeam} onMenu={setOpenMenu} onOpen={setDrawerTeam} openMenu={openMenu} team={team} />)}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center"><UsersRound aria-hidden="true" className="mx-auto size-9 text-slate-300" /><h2 className="mt-3 font-semibold text-slate-900">No teams found</h2><p className="mt-1 text-sm text-slate-500">Create your first team or change your search.</p></div>}
    {drawerTeam ? <TeamDrawer onAddMember={setAddMemberTeam} onClose={() => setDrawerTeam(null)} onDelete={setDeleteTarget} onEdit={editTeam} tab={drawerTab} setTab={setDrawerTab} team={drawerTeam} /> : null}
    {isModalOpen ? <TeamModal error={formError} form={form} isEditing={Boolean(editingTeamId)} isSaving={isSaving} onChange={setForm} onClose={() => { setEditingTeamId(null); setFormError(""); setIsModalOpen(false); }} onSubmit={() => void createTeam()} /> : null}
    {addMemberTeam ? <AddMemberModal employees={employees.filter((employee) => !addMemberTeam.members.some((member) => member.id === employee.id))} error={memberError} isSaving={isAssigningMember} onChange={setSelectedEmployeeId} onClose={() => { setAddMemberTeam(null); setMemberError(""); setSelectedEmployeeId(""); }} onSubmit={() => void assignMember()} selectedEmployeeId={selectedEmployeeId} team={addMemberTeam} /> : null}
    {deleteTarget ? <DeleteTeamDialog error={deleteError} isDeleting={isDeleting} onClose={() => { setDeleteError(""); setDeleteTarget(null); }} onConfirm={() => void deleteTeam(deleteTarget.id)} team={deleteTarget} /> : null}
  </DashboardShell>;
}

function TeamCard({ index, onDelete, onEdit, onMenu, onOpen, openMenu, team }: { index: number; onDelete: (team: Team) => void; onEdit: (team: Team) => void; onMenu: (id: string | null) => void; onOpen: (team: Team) => void; openMenu: string | null; team: Team }) {
  const Icon = team.icon;
  const active = team.members.filter((member) => member.status === "active").length;
  const trend = Math.abs(Math.round((team.utilization - team.goal) * 0.4));
  return <article className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md motion-safe:animate-[fadeInUp_.35s_ease_both]" style={{ animationDelay: `${index * 70}ms` }}><div className="flex items-start gap-3"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[10px] text-white" style={{ backgroundColor: team.color }}><Icon className="size-5" strokeWidth={1.9} /></span><div className="min-w-0 flex-1"><h2 className="text-[15px] font-bold text-slate-900">{team.name}</h2><p className="mt-0.5 truncate text-xs text-slate-400">{team.members.length} members · {team.description}</p></div><div className="relative"><button aria-label={`More actions for ${team.name}`} className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => onMenu(openMenu === team.id ? null : team.id)} type="button"><MoreHorizontal aria-hidden="true" className="size-4" /></button>{openMenu === team.id ? <div className="absolute right-0 top-9 z-10 w-36 rounded-md border border-slate-200 bg-white p-1 shadow-lg"><button className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100" onClick={() => { onOpen(team); onMenu(null); }} type="button">View details</button><button className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100" onClick={() => onEdit(team)} type="button">Edit team</button><button className="w-full rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => onDelete(team)} type="button">Delete team</button></div> : null}</div></div><div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-4 text-center"><div><p className="text-lg font-bold text-slate-900">{team.members.length}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">Members</p><p className="mt-1 text-[11px] text-slate-500">{active} active now</p></div><div><p className="text-lg font-bold text-slate-900">{team.utilization}%</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">Utilization</p><p className={`mt-1 text-[11px] ${team.utilization >= team.goal ? "text-emerald-600" : "text-red-500"}`}>{team.utilization >= team.goal ? "↑" : "↓"} {trend}% vs {team.goal}%</p></div><div><p className="text-[15px] font-bold text-slate-900">{team.workTime}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">Avg Work Time</p><p className="mt-1 text-[11px] text-slate-500">today</p></div></div><div className="mt-4"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Utilization vs goal ({team.goal}%)</span><strong className="text-slate-900">{team.utilization}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${utilizationClass(team.utilization)} transition-[width] duration-700`} style={{ width: `${team.utilization}%` }} /></div><p className={`mt-2 text-xs font-medium ${team.utilization >= team.goal ? "text-emerald-600" : "text-amber-600"}`}>{team.utilization >= team.goal ? "✓ Goal achieved" : `${team.goal - team.utilization}% below goal`}</p></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center"><div className="flex -space-x-2">{team.members.slice(0, 4).map((member) => <span aria-label={member.name} className="grid size-7 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white transition hover:-translate-y-0.5" key={member.id} style={{ backgroundColor: member.color }}>{member.initials}</span>)}{team.members.length > 4 ? <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600">+{team.members.length - 4}</span> : null}</div><span className="ml-3 text-xs text-slate-500">{team.members.length} members</span></div><button className="text-xs font-semibold text-slate-900 hover:text-slate-600" onClick={() => onOpen(team)} type="button">View <span aria-hidden="true">→</span></button></div></article>;
}

function TeamDrawer({ onAddMember, onClose, onDelete, onEdit, setTab, tab, team }: { onAddMember: (team: Team) => void; onClose: () => void; onDelete: (team: Team) => void; onEdit: (team: Team) => void; setTab: (tab: "overview" | "members" | "settings") => void; tab: "overview" | "members" | "settings"; team: Team }) {
  const Icon = team.icon;
  const active = team.members.filter((member) => member.status === "active").length;
  return <div className="fixed inset-0 z-50" role="presentation"><button aria-label="Close team details" className="absolute inset-0 bg-slate-950/20" onClick={onClose} type="button" /><aside aria-label={`${team.name} details`} aria-modal="true" className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-white shadow-2xl"><div className="flex items-center gap-3 border-b border-slate-200 p-5"><span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[11px] text-white" style={{ backgroundColor: team.color }}><Icon className="size-6" /></span><div className="min-w-0 flex-1"><h2 className="truncate text-[17px] font-bold text-slate-900">{team.name}</h2><p className="truncate text-xs text-slate-400">{team.members.length} members · {team.description}</p></div><button aria-label="Close" className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button></div><div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white px-5"><Tab active={tab === "overview"} label="Overview" onClick={() => setTab("overview")} /><Tab active={tab === "members"} label="Members" onClick={() => setTab("members")} /><Tab active={tab === "settings"} label="Settings" onClick={() => setTab("settings")} /></div><div className="flex-1 overflow-y-auto p-5">{tab === "overview" ? <><div className="grid grid-cols-3 gap-2"><MiniStat label="Members" value={String(team.members.length)} /><MiniStat label="Utilization" value={`${team.utilization}%`} /><MiniStat label="Goal" value={`${team.goal}%`} /></div><section className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Utilization trend</h3><div className="mt-3 rounded-md bg-slate-50 p-3"><Sparkline color={team.color} goal={team.goal} value={team.utilization} /></div></section><section className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Real-time status</h3><div className="mt-3 grid grid-cols-3 gap-2"><StatusBox label="Active" value={active} className="bg-emerald-50 text-emerald-700" /><StatusBox label="Idle" value={team.members.filter((member) => member.status === "idle").length} className="bg-amber-50 text-amber-700" /><StatusBox label="Offline/Break" value={team.members.filter((member) => member.status === "offline" || member.status === "break").length} className="bg-slate-100 text-slate-600" /></div></section><section className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today&apos;s metrics</h3><dl className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100">{[["Avg Work Time", team.workTime], ["Utilization", `${team.utilization}%`], ["Goal", `${team.goal}%`], ["Goal Status", team.utilization >= team.goal ? "✓ Achieved" : "✗ Not met"]].map(([label, value]) => <div className="flex justify-between gap-4 px-3 py-2.5 text-sm" key={label}><dt className="text-slate-500">{label}</dt><dd className={`font-semibold ${label === "Goal Status" ? team.utilization >= team.goal ? "text-emerald-600" : "text-red-600" : "text-slate-900"}`}>{value}</dd></div>)}</dl></section></> : tab === "members" ? <section><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{team.members.length} Members</h3><button className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700" onClick={() => onAddMember(team)} type="button"><Plus aria-hidden="true" className="size-3.5" />Add member</button></div><div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100">{team.members.map((member) => <div className="flex items-center gap-3 px-3 py-3" key={member.id}><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: member.color }}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{member.name}</span><span className="block truncate text-xs text-slate-400">{member.role}</span></span><span className="text-right"><span className={`block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(member.status)}`}>{statusLabel[member.status]}</span><span className="mt-1 block text-xs font-semibold text-slate-600">{member.util}%</span></span></div>)}</div></section> : <section><h3 className="text-sm font-semibold text-slate-900">Team settings</h3><dl className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-100">{[["Team name", team.name], ["Description", team.description], ["Utilization goal", `${team.goal}%`], ["Color", team.color]].map(([label, value]) => <div className="flex justify-between gap-4 px-3 py-3 text-sm" key={label}><dt className="text-slate-500">{label}</dt><dd className="max-w-[60%] text-right font-semibold text-slate-900">{value}</dd></div>)}</dl><div className="mt-5 flex gap-2"><Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={() => { onClose(); onEdit(team); }}>Edit settings</Button><button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => onDelete(team)} type="button">Delete team</button></div></section>}</div></aside></div>;
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button className={`border-b-2 px-3 py-3 text-xs font-semibold ${active ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400 hover:text-slate-700"}`} onClick={onClick} type="button">{label}</button>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-slate-50 p-3 text-center"><p className="text-xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p></div>; }
function StatusBox({ className, label, value }: { className: string; label: string; value: number }) { return <div className={`rounded-md p-3 text-center ${className}`}><p className="text-lg font-bold">{value}</p><p className="mt-1 text-[10px] font-medium">{label}</p></div>; }
function Sparkline({ color, goal, value }: { color: string; goal: number; value: number }) { const points = [value - 10, value - 4, value + 3, value - 2, value + 8, value + 4, value].map((point, index) => `${index * 48},${Math.max(10, 120 - Math.min(100, Math.max(20, point)) * 1.05)}`).join(" "); return <svg aria-label="Seven day utilization trend" className="h-40 w-full overflow-visible" role="img" viewBox="0 0 288 130"><line stroke="#ef4444" strokeDasharray="5 4" x1="0" x2="288" y1={120 - goal * 1.05} y2={120 - goal * 1.05} /><polyline fill={`${color}18`} points={`0,130 ${points} 288,130`} /><polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>; }

interface TeamForm { name: string; description: string; color: string; iconIndex: number; goal: string }
function AddMemberModal({ employees, error, isSaving, onChange, onClose, onSubmit, selectedEmployeeId, team }: { employees: EmployeeOption[]; error: string; isSaving: boolean; onChange: (id: string) => void; onClose: () => void; onSubmit: () => void; selectedEmployeeId: string; team: Team }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div aria-labelledby="add-member-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="dialog"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900" id="add-member-title">Add member</h2><p className="mt-1 text-sm text-slate-500">Assign or move an employee to {team.name}.</p></div><button aria-label="Close" className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button></div>{employees.length ? <label className="mt-5 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Employee</span><select autoFocus className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" onChange={(event) => onChange(event.target.value)} value={selectedEmployeeId}><option value="">Choose employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.email ? ` — ${employee.email}` : ""}</option>)}</select></label> : <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">Every employee is already in this team.</p>}{error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" disabled={isSaving} onClick={onClose} type="button">Cancel</button><Button className="bg-slate-950 hover:bg-slate-800" disabled={!selectedEmployeeId || isSaving} onClick={onSubmit}>{isSaving ? "Assigning…" : "Assign to team"}</Button></div></div></div>;
}

function DeleteTeamDialog({ error, isDeleting, onClose, onConfirm, team }: { error: string; isDeleting: boolean; onClose: () => void; onConfirm: () => void; team: Team }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div aria-labelledby="delete-team-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="alertdialog"><h2 className="text-lg font-bold text-slate-900" id="delete-team-title">Delete {team.name}?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This action cannot be undone. Teams with members cannot be deleted until their employees are moved.</p>{error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" disabled={isDeleting} onClick={onClose} type="button">Cancel</button><button className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={isDeleting} onClick={onConfirm} type="button">{isDeleting ? "Deleting…" : "Delete team"}</button></div></div></div>;
}

function TeamModal({ error, form, isEditing, isSaving, onChange, onClose, onSubmit }: { error: string; form: TeamForm; isEditing: boolean; isSaving: boolean; onChange: (form: TeamForm) => void; onClose: () => void; onSubmit: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div aria-labelledby="add-team-title" aria-modal="true" className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" role="dialog"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900" id="add-team-title">{isEditing ? "Edit team" : "Add team"}</h2><button aria-label="Close" className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button></div><label className="mt-5 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Team name <span className="text-red-500">*</span></span><input autoFocus className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="e.g. Customer Service" value={form.name} /></label><label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span><input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" onChange={(event) => onChange({ ...form, description: event.target.value })} value={form.description} /></label><div className="mt-4"><p className="mb-2 text-xs font-semibold text-slate-600">Team color</p><div className="flex flex-wrap gap-3">{palette.map((color) => <button aria-label={`Choose ${color}`} aria-pressed={form.color === color} className={`size-7 rounded-full transition hover:scale-110 ${form.color === color ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} key={color} onClick={() => onChange({ ...form, color })} style={{ backgroundColor: color }} type="button" />)}</div></div><div className="mt-4"><p className="mb-2 text-xs font-semibold text-slate-600">Team icon</p><div className="flex flex-wrap gap-2">{iconOptions.map(({ icon: Icon, label }, index) => <button aria-label={`Choose ${label} icon`} aria-pressed={form.iconIndex === index} className={`grid size-10 place-items-center rounded-md border ${form.iconIndex === index ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-400 hover:border-violet-300"}`} key={label} onClick={() => onChange({ ...form, iconIndex: index })} type="button"><Icon aria-hidden="true" className="size-5" /></button>)}</div></div><label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Utilization goal</span><input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" max="100" min="0" onChange={(event) => onChange({ ...form, goal: event.target.value })} type="number" value={form.goal} /></label>{error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}<div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button">Cancel</button><Button className="bg-violet-600 hover:bg-violet-700" disabled={isSaving} onClick={onSubmit}><Plus aria-hidden="true" className="mr-1 inline size-4" />{isSaving ? "Saving..." : isEditing ? "Save changes" : "Create team"}</Button></div></div></div>; }
