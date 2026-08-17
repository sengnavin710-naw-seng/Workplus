"use client";

import { WorkplusLogo } from "@/components/workplus-logo";
import { Bell, BriefcaseBusiness, CircleHelp, Eye, FileText, LayoutDashboard, List, Settings, Users, UsersRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LogoutButton } from "./logout-button";

const navItems = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Real-Time Insights", icon: BriefcaseBusiness, href: null },
  { label: "Alerts", icon: Bell, href: null },
  { label: "Employees", icon: Users, href: "/dashboard/employees" },
  { label: "Teams", icon: UsersRound, href: "/dashboard/teams" },
  { label: "Screenshots", icon: Eye, href: null },
  { label: "Time and Attendance", icon: FileText, href: null },
  { label: "Activities", icon: List, href: null },
  { label: "Projects", icon: BriefcaseBusiness, href: null },
  { label: "Reports", icon: FileText, href: null },
  { label: "Settings", icon: Settings, href: "/dashboard/settings/privacy" },
];

interface DashboardShellProps {
  activeNav: string;
  children: ReactNode;
  headerAction?: ReactNode;
  organizationName: string;
  role: string;
  title: string;
  userEmail: string;
  userName: string;
}

export function DashboardShell({ activeNav, children, headerAction, organizationName, role, title, userEmail, userName }: DashboardShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 ${isNavOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Primary navigation">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <WorkplusLogo compact showWordmark />
          <button aria-label="Close navigation" className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 md:hidden" onClick={() => setIsNavOpen(false)} type="button"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === activeNav;
            const content = <><Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} /><span>{item.label}</span>{!item.href ? <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-slate-400">Soon</span> : null}</>;
            return item.href ? <a className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`} href={item.href} key={item.label} onClick={() => setIsNavOpen(false)}>{content}</a> : <button aria-label={`${item.label} (Coming soon)`} className="flex w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-400" disabled key={item.label} title="Coming soon" type="button">{content}</button>;
          })}
        </nav>
        <div className="border-t border-slate-200 p-3"><div className="flex items-center gap-2 rounded-md px-1 py-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-violet-400 text-[11px] font-bold text-white">{userName.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{userName}</span><span className="block truncate text-[11px] text-slate-400">{role}</span></span><LogoutButton className="inline-flex h-7 shrink-0 items-center gap-1 px-1.5 text-[10px] leading-none" compact dark /></div></div>
      </aside>
      {isNavOpen ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/20 md:hidden" onClick={() => setIsNavOpen(false)} type="button" /> : null}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-7">
          <button aria-label="Open navigation" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setIsNavOpen(true)} type="button"><List aria-hidden="true" className="size-5" /></button>
          <h1 className="flex-1 text-xl font-bold tracking-tight">{title}</h1>
          <span className="hidden text-xs text-slate-400 lg:block">{organizationName}</span>
          <button aria-label="Help (Coming soon)" className="hidden size-9 cursor-not-allowed place-items-center rounded-full border border-slate-200 text-slate-400 sm:grid" disabled title="Coming soon" type="button"><CircleHelp aria-hidden="true" className="size-4" /></button>
          <button aria-label="Notifications (Coming soon)" className="relative grid size-9 cursor-not-allowed place-items-center rounded-full border border-slate-200 text-slate-400" disabled title="Coming soon" type="button"><Bell aria-hidden="true" className="size-4" /></button>
          {headerAction}
        </header>
        <main className="space-y-5 p-4 sm:p-7">{children}</main>
      </div>
      <p className="sr-only">Signed in as {userEmail}</p>
    </div>
  );
}
