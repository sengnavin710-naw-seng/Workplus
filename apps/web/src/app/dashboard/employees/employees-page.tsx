"use client";

import { Button } from "@repo/ui/button";
import {
  employeeJobTitles,
  personalEmployeeInvitationBatchSchema,
  updateEmployeeSchema,
  type PersonalEmployeeInvitation,
} from "@repo/validation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  Grid2X2,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  MailCheck,
  Monitor,
  Info,
  Laptop,
  ShieldCheck,
  Search,
  Trash2,
  UsersRound,
  UserRound,
  X,
  ArrowLeft,
  Apple,
  Copy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "../dashboard-shell";

type Status = "active" | "idle" | "offline" | "break";
type Tracking = "automatic" | "manual" | "disabled";
type ViewMode = "list" | "grid";
type SortField = "team" | "tracking" | "workTime" | "util";
type EnrollmentStatus =
  | "invitation"
  | "pending"
  | "not_connected"
  | "enrolled"
  | "active"
  | "revoked";
type ComputerType = "personal" | "company";
type InvitationDeliveryStatus =
  | "not_sent"
  | "not_configured"
  | "queued"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "failed"
  | "bounced"
  | "complained"
  | "suppressed";
type InvitationStatus =
  | "sent"
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";
type InvitationResponse = {
  message?: string;
  emailDelivery?: string;
  lastEmailSentAt?: string;
};
type InvitationBatchItem = {
  row: number;
  id: string | null;
  email: string;
  action: string;
  emailDelivery: "queued" | "failed";
  error?: string;
};
type InvitationBatchResult = {
  invitations: InvitationBatchItem[];
  summary: { total: number; sent: number; failed: number };
};
type EmployeeApiItem = {
  id: string;
  name: string;
  email: string | null;
  teamId: string | null;
  team: string;
  role: string;
  employeeStatus: "pending" | "active" | "archived";
  archivedAt: string | null;
  archiveReason: string | null;
  devices: Array<{
    id: string;
    agentVersion: string;
    lastSeenAt: string | null;
    status: "pending" | "active" | "revoked";
  }>;
  invitation: {
    id: string;
    status: InvitationStatus;
    deliveryStatus: InvitationDeliveryStatus;
    deliveryUpdatedAt: string | null;
    deliveryError: string | null;
    lastEmailSentAt: string | null;
  } | null;
};
type EmployeesApiResponse = { employees: EmployeeApiItem[] };

interface Employee {
  id: string | number;
  first: string;
  last: string;
  email: string;
  teamId?: string | null;
  team: string;
  role: string;
  status: Status;
  tracking: Tracking;
  workTime: string;
  util: number;
  schedule: string;
  timezone: string;
  joined: string;
  color: string;
  computerType?: ComputerType;
  enrollmentStatus?: EnrollmentStatus;
  lastSeen?: string;
  agentVersion?: string;
  devices?: number;
  invitationId?: string;
  invitationStatus?: InvitationStatus;
  deliveryStatus?: InvitationDeliveryStatus;
  deliveryUpdatedAt?: string | null;
  deliveryError?: string | null;
  lastEmailSentAt?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  archiveReason?: string | null;
}
type TeamOption = { id: string; name: string };
type TeamsApiResponse = { teams: TeamOption[] };
type PersonalInviteField = "email" | "fullName" | "teamId";
type PersonalInviteRow = {
  id: string;
  email: string;
  fullName: string;
  teamId: string;
};
type PersonalInviteRowErrors = Partial<
  Record<PersonalInviteField, string>
>;

function createPersonalInviteRow(id: number): PersonalInviteRow {
  return {
    id: `personal-invite-${id}`,
    email: "",
    fullName: "",
    teamId: "",
  };
}

function mapEmployeeApiItem(item: EmployeeApiItem, index: number): Employee {
  const nameParts = item.name.trim().split(/\s+/);
  const connectedDevices = item.devices.filter(
    (device) => device.status === "active",
  );
  const latestLastSeen = connectedDevices
    .map((device) => device.lastSeenAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const invitationStatus: EnrollmentStatus =
    item.invitation?.status === "accepted"
      ? connectedDevices.length
        ? "active"
        : "not_connected"
      : item.invitation?.status === "expired"
        ? "pending"
        : item.invitation?.status === "sent"
          ? "invitation"
          : item.invitation?.status === "revoked"
            ? "revoked"
            : "pending";
  return {
    id: item.id,
    first: nameParts[0] ?? item.name,
    last: nameParts.slice(1).join(" "),
    email: item.email ?? "",
    teamId: item.teamId,
    team: item.team,
    role: item.role,
    status:
      latestLastSeen && Date.now() - new Date(latestLastSeen).getTime() < 90_000
        ? "active"
        : "offline",
    tracking: "disabled",
    workTime: "0h 00m",
    util: 0,
    schedule: "Full Time",
    timezone: "UTC+06:30",
    joined: new Date().toISOString().slice(0, 10),
    color: avatarColor(index),
    computerType: "personal",
    enrollmentStatus: invitationStatus,
    invitationId: item.invitation?.id,
    invitationStatus: item.invitation?.status,
    deliveryStatus: item.invitation?.deliveryStatus,
    deliveryUpdatedAt: item.invitation?.deliveryUpdatedAt,
    deliveryError: item.invitation?.deliveryError,
    lastEmailSentAt: item.invitation?.lastEmailSentAt,
    lastSeen: latestLastSeen ?? "Not yet connected",
    agentVersion:
      connectedDevices.find((device) => device.lastSeenAt === latestLastSeen)
        ?.agentVersion ?? "—",
    devices: connectedDevices.length,
    isArchived: item.employeeStatus === "archived",
    archivedAt: item.archivedAt,
    archiveReason: item.archiveReason,
  };
}

interface EmployeesPageProps {
  organizationName: string;
  role: string;
  userEmail: string;
  userName: string;
}

const roles = employeeJobTitles;
const colors = [
  "#6c5ecf",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
function avatarColor(index: number) {
  return colors[index % colors.length] ?? "#6c5ecf";
}

const statusLabels: Record<Status, string> = {
  active: "Active",
  idle: "Idle",
  offline: "Offline",
  break: "On Break",
};
const trackingLabels: Record<Tracking, string> = {
  automatic: "Automatic",
  manual: "Manual",
  disabled: "Disabled",
};
const invitationDeliveryLabels: Record<InvitationDeliveryStatus, string> = {
  not_sent: "Not sent",
  not_configured: "Email not configured",
  queued: "Queued by Resend",
  sent: "Sent by Resend",
  delivered: "Delivered",
  delivery_delayed: "Delivery delayed",
  failed: "Failed",
  bounced: "Bounced",
  complained: "Marked as spam",
  suppressed: "Suppressed",
};

function fullName(employee: Employee) {
  return `${employee.first} ${employee.last}`;
}

function initials(employee: Employee) {
  return `${employee.first[0] ?? ""}${employee.last[0] ?? ""}`;
}

function statusClass(status: Status) {
  return {
    active: "bg-emerald-50 text-emerald-700",
    idle: "bg-amber-50 text-amber-700",
    offline: "bg-slate-100 text-slate-600",
    break: "bg-blue-50 text-blue-700",
  }[status];
}

function trackingClass(tracking: Tracking) {
  return {
    automatic: "bg-violet-50 text-violet-700",
    manual: "bg-amber-50 text-amber-700",
    disabled: "bg-slate-100 text-slate-500",
  }[tracking];
}

function utilizationColor(util: number) {
  if (util >= 80) return "bg-emerald-500";
  if (util >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

export function EmployeesPage({
  organizationName,
  role,
  userEmail,
  userName,
}: EmployeesPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sort, setSort] = useState<{
    field: SortField;
    ascending: boolean;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<Employee["id"]>>(
    new Set(),
  );
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeView, setEmployeeView] = useState<"current" | "archived">(
    "current",
  );
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [drawerNotice, setDrawerNotice] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);
  const [revokeTarget, setRevokeTarget] = useState<Employee | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isRefreshingEmployees, setIsRefreshingEmployees] = useState(false);
  const [employeeRefreshWarning, setEmployeeRefreshWarning] = useState("");
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [newEmployee, setNewEmployee] =
    useState<EmployeeForm>(emptyEmployeeForm());

  useEffect(() => {
    let active = true;
    setIsLoadingEmployees(true);
    setEmployeeRefreshWarning("");
    setEmployees([]);
    setSelectedIds(new Set());
    setDrawerEmployee(null);
    const endpoint =
      employeeView === "archived"
        ? "/api/employee-invitations?status=archived"
        : "/api/employee-invitations";
    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load employees");
        return (await response.json()) as EmployeesApiResponse;
      })
      .then((result) => {
        if (!active) return;
        setIsLoadingEmployees(false);
        setEmployeeRefreshWarning("");
        setEmployees(result.employees.map(mapEmployeeApiItem));
      })
      .catch(() => {
        if (!active) return;
        setIsLoadingEmployees(false);
        setEmployees([]);
        setEmployeeRefreshWarning(
          "Unable to load employees. Please try again.",
        );
      });
    return () => {
      active = false;
    };
  }, [employeeView]);

  useEffect(() => {
    let active = true;
    void fetch("/api/teams", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load teams");
        return (await response.json()) as TeamsApiResponse;
      })
      .then((result) => {
        if (active) setTeamOptions(result.teams);
      })
      .catch(() => {
        if (active) setEmployeeRefreshWarning("Unable to load teams.");
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshEmployees = useCallback(async () => {
    setIsRefreshingEmployees(true);
    try {
      const endpoint =
        employeeView === "archived"
          ? "/api/employee-invitations?status=archived"
          : "/api/employee-invitations";
      const response = await fetch(endpoint, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to refresh employees");
      const result = (await response.json()) as EmployeesApiResponse;
      const refreshedEmployees = result.employees.map(mapEmployeeApiItem);
      setEmployees(refreshedEmployees);
      const employeeIds = new Set(
        refreshedEmployees.map((employee) => employee.id),
      );
      setSelectedIds((current) =>
        new Set([...current].filter((id) => employeeIds.has(id))),
      );
      setDrawerEmployee((current) =>
        current
          ? (refreshedEmployees.find(
              (employee) => employee.id === current.id,
            ) ?? null)
          : null,
      );
      setEmployeeRefreshWarning("");
      return true;
    } catch {
      setEmployeeRefreshWarning(
        "Invitations were processed, but the employee list could not be refreshed.",
      );
      return false;
    } finally {
      setIsRefreshingEmployees(false);
    }
  }, [employeeView]);

  async function assignTeam(employeeId: Employee["id"], teamId: string) {
    const response = await fetch(`/api/employees/${employeeId}/team`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const result = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    if (!response.ok) {
      setDrawerNotice({
        kind: "error",
        message: result?.message ?? "Unable to assign team.",
      });
      return false;
    }
    await refreshEmployees();
    setDrawerNotice({ kind: "success", message: "Team assigned." });
    return true;
  }

  async function editEmployee(
    employeeId: Employee["id"],
    values: { fullName: string; role: string; teamId: string },
  ) {
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    if (!response.ok) {
      throw new Error(result?.message ?? "Unable to update employee.");
    }
    const refreshed = await refreshEmployees();
    if (!refreshed) {
      throw new Error(
        "Employee updated, but the latest employee list could not be loaded.",
      );
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = employees.filter((employee) => {
      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;
      const matchesTeam = teamFilter === "all" || employee.team === teamFilter;
      const matchesSearch =
        !query ||
        [fullName(employee), employee.email, employee.team, employee.role].some(
          (value) => value.toLowerCase().includes(query),
        );
      return matchesStatus && matchesTeam && matchesSearch;
    });

    if (!sort) return filtered;
    return [...filtered].sort((left, right) => {
      const leftValue = left[sort.field];
      const rightValue = right[sort.field];
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));
      return sort.ascending ? result : -result;
    });
  }, [employees, search, sort, statusFilter, teamFilter]);

  const activeCount = employees.filter(
    (employee) => employee.status === "active",
  ).length;
  function toggleSort(field: SortField) {
    setSort((current) =>
      current?.field === field
        ? { field, ascending: !current.ascending }
        : { field, ascending: true },
    );
  }

  function toggleSelected(id: Employee["id"]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) =>
      current.size === filteredEmployees.length
        ? new Set()
        : new Set(filteredEmployees.map((employee) => employee.id)),
    );
  }

  async function archiveEmployee(reason: string) {
    if (!archiveTarget) return;
    setIsArchiving(true);
    setArchiveError("");
    try {
      const response = await fetch(`/api/employees/${archiveTarget.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        setArchiveError(result?.message ?? "Unable to archive employee.");
        return;
      }
      setArchiveTarget(null);
      setDrawerEmployee(null);
      await refreshEmployees();
    } catch {
      setArchiveError("Unable to archive employee. Try again.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function restoreEmployee(employee: Employee) {
    setDrawerNotice(null);
    try {
      const response = await fetch(`/api/employees/${employee.id}/restore`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        setDrawerNotice({
          kind: "error",
          message: result?.message ?? "Unable to restore employee.",
        });
        return;
      }
      setDrawerEmployee(null);
      await refreshEmployees();
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "Unable to restore employee. Try again.",
      });
    }
  }

  function openEmployeeDrawer(employee: Employee) {
    setDrawerNotice(null);
    setDrawerEmployee(employee);
  }

  async function resendInvitation(id: Employee["id"]) {
    const employee = employees.find((item) => item.id === id);
    setDrawerNotice(null);
    if (employee?.invitationId) {
      let response: Response;
      setResendingInvitationId(employee.invitationId);
      try {
        response = await fetch("/api/employee-invitations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationId: employee.invitationId,
            action: "resend",
          }),
        });
      } catch {
        setResendingInvitationId(null);
        setDrawerNotice({
          kind: "error",
          message:
            "WorkPlus could not reach the email service. Please try again.",
        });
        return;
      }
      const result = (await response.json().catch(() => null)) as InvitationResponse | null;
      setResendingInvitationId(null);
      if (!response.ok) {
        setDrawerNotice({
          kind: "error",
          message: result?.message ?? "The invitation could not be updated.",
        });
        return;
      }
      if (!result?.emailDelivery) {
        setDrawerNotice({
          kind: "error",
          message: "Email delivery could not be confirmed.",
        });
        return;
      }
      setDrawerNotice({
        kind: "success",
        message: "Invitation accepted by Resend. Delivery status will update automatically.",
      });
    } else {
      setDrawerNotice({
        kind: "error",
        message: "No invitation is available for this employee.",
      });
      return;
    }
    await refreshEmployees();
  }

  async function revokeInvitation() {
    if (!revokeTarget?.invitationId) return;
    setIsRevoking(true);
    setRevokeError("");
    setDrawerNotice(null);
    try {
      const response = await fetch("/api/employee-invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: revokeTarget.invitationId,
          action: "revoke",
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | InvitationResponse
        | null;
      if (!response.ok) {
        setRevokeError(result?.message ?? "The invitation could not be revoked.");
        return;
      }
      setRevokeTarget(null);
      await refreshEmployees();
      setDrawerNotice({
        kind: "success",
        message: "Invitation revoked. The previous link can no longer be used.",
      });
    } catch {
      setRevokeError("WorkPlus could not revoke the invitation. Please try again.");
    } finally {
      setIsRevoking(false);
    }
  }

  function exportCsv() {
    const header = [
      "Name",
      "Email",
      "Team",
      "Role",
      "Status",
      "Tracking",
      "Work time",
      "Utilization",
    ];
    const rows = filteredEmployees.map((employee) => [
      fullName(employee),
      employee.email,
      employee.team,
      employee.role,
      statusLabels[employee.status],
      trackingLabels[employee.tracking],
      employee.workTime,
      `${employee.util}%`,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "workplus-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function addEmployee(
    rows?: PersonalEmployeeInvitation[],
  ): Promise<InvitationBatchResult | null> {
    if (
      !rows &&
      newEmployee.computerType === "company" &&
      (!newEmployee.first.trim() || !newEmployee.team || !newEmployee.role)
    ) {
      setFormError("Please complete the required fields.");
      return null;
    }
    if (
      !rows &&
      newEmployee.computerType === "company" &&
      newEmployee.tracking &&
      !newEmployee.consent
    ) {
      setFormError(
        "Privacy acknowledgement is required before enabling tracking.",
      );
      return null;
    }
    if (rows) {
      const response = await fetch("/api/employee-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employees: rows,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | InvitationBatchResult
        | {
          message?: string;
        }
        | null;
      if (
        !result ||
        !("invitations" in result) ||
        !("summary" in result)
      ) {
        setFormError(
          result?.message ?? "Unable to send the invitation.",
        );
        return null;
      }
      setNewEmployee(emptyEmployeeForm());
      setFormError("");
      await refreshEmployees();
      return result;
    }
    const employee: Employee = {
      id: Date.now(),
      first: newEmployee.first.trim(),
      last: newEmployee.last.trim(),
      email: newEmployee.email.trim() || "Not provided",
      team: newEmployee.team,
      role: newEmployee.role || "Customer Service",
      status: "offline",
      tracking: newEmployee.tracking ? "automatic" : "disabled",
      workTime: "0h 00m",
      util: 0,
      schedule: newEmployee.schedule,
      timezone: newEmployee.timezone,
      joined: new Date().toISOString().slice(0, 10),
      color: avatarColor(employees.length),
      computerType: newEmployee.computerType,
      enrollmentStatus: "not_connected",
      lastSeen: "Not yet connected",
      agentVersion: "—",
      devices: 0,
    };
    setEmployees((current) => [employee, ...current]);
    setNewEmployee(emptyEmployeeForm());
    setFormError("");
    setIsModalOpen(false);
    return null;
  }

  return (
    <DashboardShell
      activeNav="Employees"
      headerAction={
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />{" "}
          <span className="hidden sm:inline">Add Employee</span>
          <span className="sm:hidden">Add</span>
        </button>
      }
      organizationName={organizationName}
      role={role}
      title="Employees"
      userEmail={userEmail}
      userName={userName}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Employee status filters"
        >
          <FilterChip
            active={employeeView === "current"}
            label="Current"
            onClick={() => {
              setEmployeeView("current");
              setStatusFilter("all");
            }}
          />
          <FilterChip
            active={employeeView === "archived"}
            label="Archived"
            onClick={() => {
              setEmployeeView("archived");
              setStatusFilter("all");
            }}
          />
          {employeeView === "current" ? (
            <>
          <FilterChip
            active={statusFilter === "all"}
            label={`All ${employees.length}`}
            onClick={() => setStatusFilter("all")}
          />
          <FilterChip
            active={statusFilter === "active"}
            color="bg-emerald-500"
            label={`Active ${activeCount}`}
            onClick={() => setStatusFilter("active")}
          />
          <FilterChip
            active={statusFilter === "idle"}
            color="bg-amber-500"
            label={`Idle ${employees.filter((employee) => employee.status === "idle").length}`}
            onClick={() => setStatusFilter("idle")}
          />
          <FilterChip
            active={statusFilter === "offline"}
            color="bg-slate-400"
            label={`Offline ${employees.filter((employee) => employee.status === "offline").length}`}
            onClick={() => setStatusFilter("offline")}
          />
          <FilterChip
            active={statusFilter === "break"}
            color="bg-blue-500"
            label={`On Break ${employees.filter((employee) => employee.status === "break").length}`}
            onClick={() => setStatusFilter("break")}
          />
            </>
          ) : null}
        </div>
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            aria-label="Filter by team"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            onChange={(event) => setTeamFilter(event.target.value)}
            value={teamFilter}
          >
            <option value="all">All Teams</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.name}>{team.name}</option>
            ))}
          </select>
          <label className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400"
            />
            <span className="sr-only">Search employees</span>
            <input
              aria-label="Search employees"
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees..."
              value={search}
            />
          </label>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            onClick={exportCsv}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <div
            className="flex h-9 overflow-hidden rounded-md border border-slate-200 bg-white"
            role="group"
            aria-label="Change employee view"
          >
            <button
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={`grid w-9 place-items-center ${viewMode === "list" ? "bg-violet-50 text-violet-700" : "text-slate-400 hover:bg-slate-50"}`}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <List aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`grid w-9 place-items-center ${viewMode === "grid" ? "bg-violet-50 text-violet-700" : "text-slate-400 hover:bg-slate-50"}`}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <Grid2X2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {employeeRefreshWarning ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <span>{employeeRefreshWarning}</span>
          <button
            className="font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshingEmployees}
            onClick={() => void refreshEmployees()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>
          <strong className="font-semibold text-slate-900">
            {employees.length}
          </strong>{" "}
          {employeeView === "archived" ? "archived employees" : "employees"}
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
        <span>
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-2 rounded-full bg-emerald-500"
          />
          <strong className="font-semibold text-slate-900">
            {activeCount}
          </strong>{" "}
          active now
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Activity metrics arrive after Phase 3 collection and Phase 4 aggregation
        </span>
        {isLoadingEmployees || isRefreshingEmployees ? (
          <span aria-live="polite" className="text-xs text-slate-500">
            {isLoadingEmployees ? "Loading employees…" : "Refreshing…"}
          </span>
        ) : null}
      </div>

      {isLoadingEmployees ? (
        <EmployeeTableSkeleton />
      ) : viewMode === "list" ? (
        <EmployeeTable
          employees={filteredEmployees}
          selectedIds={selectedIds}
          onSelect={toggleSelected}
          onSelectAll={toggleAll}
          onOpen={openEmployeeDrawer}
          onEdit={setEditingEmployee}
          onRemove={setArchiveTarget}
          onSort={toggleSort}
          sort={sort}
        />
      ) : (
        <EmployeeGrid
          employees={filteredEmployees}
          onOpen={openEmployeeDrawer}
          onRemove={setArchiveTarget}
        />
      )}
      {!isLoadingEmployees && filteredEmployees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <UsersRound
            aria-hidden="true"
            className="mx-auto size-9 text-slate-300"
          />
          <h2 className="mt-3 font-semibold text-slate-900">
            No employees found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try changing the filter or search term.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing {filteredEmployees.length} of {employees.length} employees
        </span>
        <div className="flex gap-1">
          <button
            aria-label="Previous page"
            className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white hover:border-violet-300 hover:text-violet-700"
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-current="page"
            className="grid size-8 place-items-center rounded-md bg-violet-600 text-white"
            type="button"
          >
            1
          </button>
          <button
            aria-label="Next page"
            className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white hover:border-violet-300 hover:text-violet-700"
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      {drawerEmployee ? (
        <EmployeeDrawer
          employee={drawerEmployee}
          notice={drawerNotice}
          onClose={() => {
            setDrawerNotice(null);
            setDrawerEmployee(null);
          }}
          onRemove={setArchiveTarget}
          onEdit={setEditingEmployee}
          onRestore={(employee) => void restoreEmployee(employee)}
          onResendInvitation={(id) => void resendInvitation(id)}
          onRevokeInvitation={(employee) => {
            setRevokeError("");
            setRevokeTarget(employee);
          }}
          onAssignTeam={assignTeam}
          teams={teamOptions}
          isResending={resendingInvitationId === drawerEmployee.invitationId}
        />
      ) : null}
      {editingEmployee ? (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSubmit={(values) => editEmployee(editingEmployee.id, values)}
          teams={teamOptions}
        />
      ) : null}
      {archiveTarget ? (
        <ArchiveEmployeeDialog
          employee={archiveTarget}
          error={archiveError}
          isArchiving={isArchiving}
          onClose={() => {
            if (isArchiving) return;
            setArchiveError("");
            setArchiveTarget(null);
          }}
          onConfirm={(reason) => void archiveEmployee(reason)}
        />
      ) : null}
      {revokeTarget ? (
        <RevokeInvitationDialog
          employee={revokeTarget}
          error={revokeError}
          isRevoking={isRevoking}
          onClose={() => {
            if (isRevoking) return;
            setRevokeError("");
            setRevokeTarget(null);
          }}
          onConfirm={() => void revokeInvitation()}
        />
      ) : null}
      {isModalOpen ? (
        <AddEmployeeModal
          employee={newEmployee}
          error={formError}
          onChange={setNewEmployee}
          onClose={() => {
            setFormError("");
            setIsModalOpen(false);
          }}
          onSubmit={(rows) => addEmployee(rows)}
          teams={teamOptions}
        />
      ) : null}
    </DashboardShell>
  );
}

function FilterChip({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"}`}
      onClick={onClick}
      type="button"
    >
      {color ? (
        <span aria-hidden="true" className={`size-1.5 rounded-full ${color}`} />
      ) : null}
      {label}
    </button>
  );
}

function SortButton({
  field,
  label,
  onSort,
  sort,
}: {
  field: SortField;
  label: string;
  onSort: (field: SortField) => void;
  sort: { field: SortField; ascending: boolean } | null;
}) {
  const isSorted = sort?.field === field;
  return (
    <button
      className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${isSorted ? "text-violet-700" : "text-slate-500"}`}
      onClick={() => onSort(field)}
      type="button"
    >
      {label}
      <ChevronDown
        aria-hidden="true"
        className={`size-3 transition-transform ${isSorted && !sort.ascending ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${status === "active" ? "bg-emerald-500 motion-safe:animate-pulse" : status === "idle" ? "bg-amber-500" : status === "break" ? "bg-blue-500" : "bg-slate-400"}`}
      />
      {statusLabels[status]}
    </span>
  );
}

function TrackingChip({ tracking }: { tracking: Tracking }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${trackingClass(tracking)}`}
    >
      {trackingLabels[tracking]}
    </span>
  );
}

const enrollmentLabels: Record<EnrollmentStatus, string> = {
  invitation: "Invitation sent",
  pending: "Pending acceptance",
  not_connected: "Agent not connected",
  enrolled: "Enrolled",
  active: "Active",
  revoked: "Revoked",
};
const enrollmentClasses: Record<EnrollmentStatus, string> = {
  invitation: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  not_connected: "bg-slate-100 text-slate-600",
  enrolled: "bg-violet-50 text-violet-700",
  active: "bg-emerald-50 text-emerald-700",
  revoked: "bg-red-50 text-red-700",
};

function EnrollmentChip({ status = "pending" }: { status?: EnrollmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${enrollmentClasses[status]}`}
    >
      {enrollmentLabels[status]}
    </span>
  );
}

function EmployeeTableSkeleton() {
  return (
    <div
      aria-label="Loading employees"
      aria-live="polite"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      role="status"
    >
      <span className="sr-only">Loading employees</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-12 border-b border-slate-100 bg-slate-50" />
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-6 px-5 py-4"
              key={index}
            >
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeeTable({
  employees,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
  onEdit,
  onRemove,
  onSort,
  sort,
}: {
  employees: Employee[];
  selectedIds: Set<Employee["id"]>;
  onSelect: (id: Employee["id"]) => void;
  onSelectAll: () => void;
  onOpen: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
  onSort: (field: SortField) => void;
  sort: { field: SortField; ascending: boolean } | null;
}) {
  const allSelected =
    employees.length > 0 &&
    employees.every((employee) => selectedIds.has(employee.id));
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  aria-label="Select all employees"
                  checked={allSelected}
                  className="size-4 accent-violet-600"
                  onChange={onSelectAll}
                  type="checkbox"
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                Employee
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton
                  field="team"
                  label="Team"
                  onSort={onSort}
                  sort={sort}
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton
                  field="tracking"
                  label="Tracking"
                  onSort={onSort}
                  sort={sort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton
                  field="workTime"
                  label="Work Time"
                  onSort={onSort}
                  sort={sort}
                />
              </th>
              <th className="min-w-36 px-4 py-3 text-left">
                <SortButton
                  field="util"
                  label="Utilization"
                  onSort={onSort}
                  sort={sort}
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                Role
              </th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                className="group border-t border-slate-100 transition-colors hover:bg-violet-50/30"
                key={employee.id}
              >
                <td className="px-4 py-3">
                  <input
                    aria-label={`Select ${fullName(employee)}`}
                    checked={selectedIds.has(employee.id)}
                    className="size-4 accent-violet-600"
                    onChange={() => onSelect(employee.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    className="flex items-center gap-3 text-left"
                    onClick={() => onOpen(employee)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: employee.color }}
                    >
                      {initials(employee)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {fullName(employee)}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {employee.email}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {employee.team}
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={employee.status} />
                </td>
                <td className="px-4 py-3">
                  <TrackingChip tracking={employee.tracking} />
                </td>
                <td className="px-4 py-3 text-sm font-medium tabular-nums text-slate-700">
                  {employee.workTime}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      aria-hidden="true"
                      className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className={`h-full rounded-full ${utilizationColor(employee.util)}`}
                        style={{ width: `${employee.util}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">
                      {employee.util}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {employee.role}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      aria-label={`View ${fullName(employee)}`}
                      className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-700"
                      onClick={() => onOpen(employee)}
                      type="button"
                    >
                      <Eye aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label={`Edit ${fullName(employee)}`}
                      className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-violet-300 hover:text-violet-700"
                      onClick={() => onEdit(employee)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label={`Remove ${fullName(employee)}`}
                      className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-600"
                      onClick={() => onRemove(employee)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <button
                    aria-label={`More actions for ${fullName(employee)}`}
                    className="ml-auto grid size-8 place-items-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600 md:hidden"
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeGrid({
  employees,
  onOpen,
  onRemove,
}: {
  employees: Employee[];
  onOpen: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee) => (
        <article
          className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
          key={employee.id}
        >
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-gradient-to-r from-violet-600 to-violet-300" />
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: employee.color }}
            >
              {initials(employee)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {fullName(employee)}
              </h2>
              <p className="truncate text-xs text-slate-400">
                {employee.role} · {employee.team}
              </p>
              <div className="mt-2">
                <StatusChip status={employee.status} />
              </div>
              <div className="mt-2">
                <EnrollmentChip status={employee.enrollmentStatus} />
              </div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Work time
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {employee.workTime}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Utilization
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {employee.util}%
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Tracking
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {trackingLabels[employee.tracking]}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Schedule
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {employee.schedule}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex gap-2">
            <button
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              onClick={() => onOpen(employee)}
              type="button"
            >
              View profile
            </button>
            <button
              aria-label={`Remove ${fullName(employee)}`}
              className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600"
              onClick={() => onRemove(employee)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmployeeDrawer({
  employee,
  isResending,
  notice,
  onClose,
  onEdit,
  onRemove,
  onRestore,
  onResendInvitation,
  onRevokeInvitation,
  onAssignTeam,
  teams,
}: {
  employee: Employee;
  isResending: boolean;
  notice: { kind: "error" | "success"; message: string } | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
  onRestore: (employee: Employee) => void;
  onResendInvitation: (id: Employee["id"]) => void;
  onRevokeInvitation: (employee: Employee) => void;
  onAssignTeam: (id: Employee["id"], teamId: string) => Promise<boolean>;
  teams: TeamOption[];
}) {
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const productiveTime = employee.util
    ? `${Math.round(((Number(employee.workTime.match(/\d+/)?.[0] ?? 0) * 60 + Number(employee.workTime.match(/\d+/g)?.[1] ?? 0)) * employee.util) / 100)}m`
    : "—";
  const activity = [
    ["Work time", employee.workTime],
    ["Productive time", productiveTime],
    ["Utilization", `${employee.util}%`],
    ["Status", statusLabels[employee.status]],
  ];

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        aria-label="Close employee details"
        className="absolute inset-0 bg-slate-950/20"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label={`${fullName(employee)} details`}
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full text-base font-bold text-white"
            style={{ backgroundColor: employee.color }}
          >
            {initials(employee)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900">
              {fullName(employee)}
            </h2>
            <p className="truncate text-xs text-slate-400">
              {employee.role} · {employee.team}
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Overview
            </h3>
            <div className="mt-3 flex gap-2">
              <StatusChip status={employee.status} />
              <TrackingChip tracking={employee.tracking} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Utilization</span>
                <strong className="text-slate-900">{employee.util}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${utilizationColor(employee.util)}`}
                  style={{ width: `${employee.util}%` }}
                />
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Today&apos;s activity
            </h3>
            <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100">
              {activity.map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                  key={label}
                >
                  <span className="text-slate-500">{label}</span>
                  <strong className="text-right text-slate-900">{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Employee details
            </h3>
            <dl className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100">
              {[
                ["Email", employee.email],
                ["Team", employee.team],
                ["Role", employee.role],
                ...(employee.isArchived
                  ? [
                      [
                        "Archived",
                        employee.archivedAt
                          ? new Date(employee.archivedAt).toLocaleString()
                          : "Archived",
                      ],
                      ["Archive reason", employee.archiveReason ?? "Not provided"],
                    ]
                  : []),
                ["Schedule", employee.schedule],
                ["Timezone", employee.timezone],
                ["Joined", employee.joined],
                ["Tracking mode", trackingLabels[employee.tracking]],
                [
                  "Enrollment",
                  enrollmentLabels[employee.enrollmentStatus ?? "pending"],
                ],
                [
                  "Email delivery",
                  employee.deliveryStatus
                    ? invitationDeliveryLabels[employee.deliveryStatus]
                    : "Not available",
                ],
                [
                  "Last invitation email",
                  employee.lastEmailSentAt
                    ? new Date(employee.lastEmailSentAt).toLocaleString()
                    : "Not sent",
                ],
                ["Last seen", employee.lastSeen ?? "Not yet connected"],
                ["Agent version", employee.agentVersion ?? "—"],
                ["Connected devices", String(employee.devices ?? 0)],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                  key={label}
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="max-w-[58%] text-right font-semibold text-slate-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {employee.deliveryError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {employee.deliveryError}
              </p>
            ) : null}
          </section>
        </div>
        <div className="border-t border-slate-200 p-5">
          {notice ? (
            <p
              className={`mb-3 rounded-md border px-3 py-2 text-xs font-medium ${
                notice.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
              role="status"
            >
              {notice.message}
            </p>
          ) : null}
          <div className="mb-3 flex flex-wrap gap-2">
            {employee.isArchived ? (
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => onRestore(employee)}
                type="button"
              >
                Restore employee
              </button>
            ) : null}
            {!employee.isArchived ? (
              <>
            {employee.computerType === "personal" &&
            employee.invitationStatus &&
            employee.invitationStatus !== "accepted" ? (
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isResending}
                onClick={() => onResendInvitation(employee.id)}
                type="button"
              >
                <MailCheck
                  aria-hidden="true"
                  className="mr-1 inline size-3.5"
                />
                {isResending
                  ? "Sending…"
                  : employee.invitationStatus === "revoked" ||
                      employee.invitationStatus === "expired"
                    ? "Send new invitation"
                    : "Resend invitation"}
              </button>
            ) : null}
            {employee.invitationStatus === "sent" ||
            employee.invitationStatus === "pending" ? (
              <button
                className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isResending}
                onClick={() => onRevokeInvitation(employee)}
                type="button"
              >
                Revoke invitation
              </button>
            ) : null}
            <button
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50"
              onClick={() => setIsAssigningTeam((current) => !current)}
              type="button"
            >Assign team</button>
              </>
            ) : null}
          </div>
          {!employee.isArchived && isAssigningTeam ? (
            <div className="mb-3 flex gap-2 rounded-md border border-slate-200 p-2">
              <select className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-2 text-sm" onChange={(event) => setSelectedTeamId(event.target.value)} value={selectedTeamId}>
                <option value="">Choose team</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <button className="rounded-md bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={!selectedTeamId} onClick={() => void onAssignTeam(employee.id, selectedTeamId).then((success) => { if (success) setIsAssigningTeam(false); })} type="button">Save</button>
            </div>
          ) : null}
          {!employee.isArchived ? (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-slate-950 hover:bg-slate-800"
              onClick={() => onEdit(employee)}
            >
              Edit employee
            </Button>
            <button
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => onRemove(employee)}
              type="button"
            >
              Archive
            </button>
          </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function EditEmployeeModal({
  employee,
  onClose,
  onSubmit,
  teams,
}: {
  employee: Employee;
  onClose: () => void;
  onSubmit: (values: {
    fullName: string;
    role: string;
    teamId: string;
  }) => Promise<void>;
  teams: TeamOption[];
}) {
  const [form, setForm] = useState({
    fullName: fullName(employee),
    role: employee.role,
    teamId:
      employee.teamId ??
      teams.find((team) => team.name === employee.team)?.id ??
      "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const parsed = updateEmployeeSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check employee details.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update employee.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        aria-labelledby="edit-employee-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              className="text-lg font-bold text-slate-950"
              id="edit-employee-title"
            >
              Edit employee
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the employee&apos;s profile and current team.
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Full name
            </span>
            <input
              autoFocus
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={isSaving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              value={form.fullName}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Role
            </span>
            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={isSaving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value,
                }))
              }
              value={form.role}
            >
              {roles.map((jobTitle) => (
                <option key={jobTitle} value={jobTitle}>
                  {jobTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Team
            </span>
            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={isSaving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  teamId: event.target.value,
                }))
              }
              value={form.teamId}
            >
              <option value="">Choose team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <Button
            className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? "Savingâ€¦" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ArchiveEmployeeDialog({
  employee,
  error,
  isArchiving,
  onClose,
  onConfirm,
}: {
  employee: Employee;
  error: string;
  isArchiving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div
        aria-labelledby="archive-employee-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="alertdialog"
      >
        <h2
          className="text-lg font-bold text-slate-950"
          id="archive-employee-title"
        >
          Archive {fullName(employee)}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          They will be removed from current employee and team views. Pending
          invitations and connected devices will be revoked. Historical records
          will be preserved.
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Reason (optional)
          </span>
          <textarea
            autoFocus
            className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={isArchiving}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: Employment ended"
            value={reason}
          />
        </label>
        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={isArchiving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={isArchiving}
            onClick={() => onConfirm(reason)}
            type="button"
          >
            {isArchiving ? "Archivingâ€¦" : "Archive employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RevokeInvitationDialog({
  employee,
  error,
  isRevoking,
  onClose,
  onConfirm,
}: {
  employee: Employee;
  error: string;
  isRevoking: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isRevoking) onClose();
    }
    function keepFocusInside(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("keydown", keepFocusInside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("keydown", keepFocusInside);
      previouslyFocused?.focus();
    };
  }, [isRevoking, onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div
        aria-describedby="revoke-invitation-description"
        aria-labelledby="revoke-invitation-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        ref={dialogRef}
        role="alertdialog"
      >
        <h2
          className="text-lg font-bold text-slate-950"
          id="revoke-invitation-title"
        >
          Revoke invitation for {fullName(employee)}?
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          id="revoke-invitation-description"
        >
          The current invitation link will stop working. An email that has
          already been delivered cannot be recalled, but you can send a new
          invitation later.
        </p>
        {employee.email ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {employee.email}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            autoFocus
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={isRevoking}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRevoking}
            onClick={onConfirm}
            type="button"
          >
            {isRevoking ? "Revoking…" : "Revoke invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

type EmployeeForm = {
  first: string;
  last: string;
  email: string;
  team: string;
  role: string;
  schedule: string;
  timezone: string;
  tracking: boolean;
  welcomeEmail: boolean;
  computerType: ComputerType;
  consent: boolean;
  screenshots: boolean;
};

function emptyEmployeeForm(): EmployeeForm {
  return {
    first: "",
    last: "",
    email: "",
    team: "",
    role: "",
    schedule: "Full Time",
    timezone: "UTC+06:30",
    tracking: true,
    welcomeEmail: true,
    computerType: "personal",
    consent: false,
    screenshots: false,
  };
}

function AddEmployeeModal({
  employee,
  error,
  onChange,
  onClose,
  onSubmit,
  teams,
}: {
  employee: EmployeeForm;
  error: string;
  onChange: (employee: EmployeeForm) => void;
  onClose: () => void;
  onSubmit: (
    rows?: PersonalEmployeeInvitation[],
  ) => Promise<InvitationBatchResult | null>;
  teams: TeamOption[];
}) {
  const [screen, setScreen] = useState<
    "selection" | "company" | "personal" | "success"
  >("selection");
  const [copied, setCopied] = useState(false);
  const [personalRows, setPersonalRows] = useState<PersonalInviteRow[]>(() => [
    createPersonalInviteRow(1),
  ]);
  const nextPersonalRowId = useRef(1);
  const [personalRowErrors, setPersonalRowErrors] = useState<
    Record<string, PersonalInviteRowErrors>
  >({});
  const [personalBatchError, setPersonalBatchError] = useState("");
  const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
  const [invitationBatchResult, setInvitationBatchResult] =
    useState<InvitationBatchResult | null>(null);
  function update(field: keyof EmployeeForm, value: string | boolean) {
    onChange({ ...employee, [field]: value });
  }
  const isPersonal = employee.computerType === "personal";
  const installationUrl = "https://app.workplus.io/installation/company";
  async function copyInstallationUrl() {
    await navigator.clipboard?.writeText(installationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  function updatePersonalRow(
    index: number,
    field: PersonalInviteField,
    value: string,
  ) {
    setPersonalRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
    setPersonalBatchError("");
    const rowId = personalRows[index]?.id;
    if (rowId) {
      setPersonalRowErrors((current) => {
        if (!current[rowId]?.[field]) return current;
        const next = { ...current };
        const rowError = { ...next[rowId] };
        delete rowError[field];
        if (Object.keys(rowError).length) next[rowId] = rowError;
        else delete next[rowId];
        return next;
      });
    }
  }
  async function submitPersonalEmployees() {
    const parsed = personalEmployeeInvitationBatchSchema.safeParse(
      personalRows.map(({ email, fullName, teamId }) => ({
        email,
        fullName,
        teamId,
        role: "Customer Service" as const,
      })),
    );
    if (!parsed.success) {
      const nextErrors: Record<string, PersonalInviteRowErrors> = {};
      let firstInvalidControlId: string | null = null;
      let nextBatchError = "";

      for (const issue of parsed.error.issues) {
        const rowIndex = issue.path[0];
        const field = issue.path[1];
        if (
          typeof rowIndex !== "number" ||
          (field !== "email" &&
            field !== "fullName" &&
            field !== "teamId")
        ) {
          nextBatchError ||= issue.message;
          continue;
        }
        const row = personalRows[rowIndex];
        if (!row) continue;
        nextErrors[row.id] = {
          ...nextErrors[row.id],
          [field]: issue.message,
        };
        firstInvalidControlId ??= `${row.id}-${field}`;
      }

      setPersonalRowErrors(nextErrors);
      setPersonalBatchError(nextBatchError);
      if (firstInvalidControlId) {
        window.requestAnimationFrame(() =>
          document.getElementById(firstInvalidControlId)?.focus(),
        );
      }
      return;
    }

    setPersonalRowErrors({});
    setPersonalBatchError("");
    setIsSubmittingPersonal(true);
    try {
      const result = await onSubmit(parsed.data);
      if (result) {
        setInvitationBatchResult(result);
        setScreen("success");
      }
    } finally {
      setIsSubmittingPersonal(false);
    }
  }
  async function retryFailedInvitations() {
    if (!invitationBatchResult) return;
    const failedRows = invitationBatchResult.invitations
      .filter((result) => result.emailDelivery === "failed")
      .map((result) => personalRows[result.row])
      .filter((row): row is PersonalInviteRow => Boolean(row))
      .map(({ email, fullName, teamId }) => ({
        email,
        fullName,
        teamId,
        role: "Customer Service" as const,
      }));
    if (!failedRows.length) return;
    setIsSubmittingPersonal(true);
    try {
      const retried = await onSubmit(failedRows);
      if (!retried) return;
      const retriedByEmail = new Map(
        retried.invitations.map((result) => [result.email, result]),
      );
      const invitations = invitationBatchResult.invitations.map(
        (result) => retriedByEmail.get(result.email) ?? result,
      );
      const sent = invitations.filter(
        (result) => result.emailDelivery === "queued",
      ).length;
      setInvitationBatchResult({
        invitations,
        summary: {
          total: invitations.length,
          sent,
          failed: invitations.length - sent,
        },
      });
    } finally {
      setIsSubmittingPersonal(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="add-employee-title"
        aria-modal="true"
        className="max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-7 py-5">
          <h2
            className="text-xl font-bold tracking-tight text-slate-900"
            id="add-employee-title"
          >
            {screen === "success"
              ? "Add New Employees - Personal Computers"
              : screen === "personal"
                ? "Add New Employees - Personal Computers"
                : screen === "company"
                  ? "Add New Employees - Company Computers"
                  : "Add New Employees & Download"}
          </h2>
          <button
            aria-label="Close"
            className="grid size-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="px-7 py-3 sm:px-10 sm:py-4">
          <section
            className={
              screen === "success" ? "py-6 text-center sm:py-8" : "hidden"
            }
          >
            <MailCheck
              aria-hidden="true"
              className="mx-auto size-28 text-slate-400"
              strokeWidth={1.2}
            />
            <h3 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
              {invitationBatchResult?.summary.failed
                ? "Some invitations need attention"
                : "Invitations are on the way to your employees"}
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              {invitationBatchResult
                ? `${invitationBatchResult.summary.sent} queued, ${invitationBatchResult.summary.failed} failed out of ${invitationBatchResult.summary.total}.`
                : "Invitation processing is complete."}
            </p>
            {invitationBatchResult ? (
              <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-xl border border-slate-200 text-left">
                {invitationBatchResult.invitations.map((result) => (
                  <div
                    className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                    key={`${result.row}-${result.email}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">
                        {result.email}
                      </p>
                      {result.error ? (
                        <p className="mt-1 text-sm text-red-600">
                          {result.error}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${result.emailDelivery === "queued" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {result.emailDelivery === "queued" ? "Queued" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              className="mx-auto mt-8 inline-flex items-center gap-2 text-base font-medium text-slate-950 underline underline-offset-4"
              type="button"
            >
              <CircleHelp aria-hidden="true" className="size-5" />
              Not sure what is the next step for your employees?{" "}
              <span className="font-bold">Learn here.</span>
            </button>
          </section>
          <section className={screen === "selection" ? "" : "hidden"}>
            <h3 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Choose Your Employee&apos;s Computer Type
            </h3>
            <button
              className="mx-auto mt-3 flex items-center gap-2 text-sm font-medium text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950"
              type="button"
            >
              <CircleHelp aria-hidden="true" className="size-5" />
              Not sure which to choose? Learn here.
            </button>
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <button
                aria-pressed={!isPersonal}
                className="group flex min-h-[300px] flex-col rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-colors hover:border-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={() => {
                  update("computerType", "company");
                  setScreen("company");
                }}
                type="button"
              >
                <Monitor
                  aria-hidden="true"
                  className="mx-auto size-16 text-slate-950"
                  strokeWidth={1.5}
                />
                <span className="mt-5 block text-lg font-semibold text-slate-500 transition-colors group-hover:text-slate-950">
                  Company Computers
                </span>
                <span className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  Employees work on company-owned computers, and only admins
                  will be able to modify tracking settings.
                </span>
                <span className="mt-auto inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition-colors group-hover:border-slate-950 group-hover:bg-slate-950 group-hover:text-white">
                  Company Computers
                </span>
              </button>
              <button
                aria-pressed={isPersonal}
                className="group flex min-h-[300px] flex-col rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-colors hover:border-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={() => {
                  update("computerType", "personal");
                  setScreen("personal");
                }}
                type="button"
              >
                <UserRound
                  aria-hidden="true"
                  className="mx-auto size-16 text-slate-950"
                  strokeWidth={1.5}
                />
                <span className="mt-5 block text-lg font-semibold text-slate-500 transition-colors group-hover:text-slate-950">
                  Personal Computers
                </span>
                <span className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  Employees work on their personal computers and should have the
                  ability to control when the app tracks their activities.
                </span>
                <span className="mt-auto inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition-colors group-hover:border-slate-950 group-hover:bg-slate-950 group-hover:text-white">
                  Personal Computers
                </span>
              </button>
              {/* Keep the existing selection state and onboarding behavior; the cards are the selection controls. */}
              {/* legacy card markup intentionally replaced by the reference-style cards above */}
              {/*
              onClick={() => { update("computerType", "personal"); setScreen("personal"); }}
              type="button"
            >
              <Laptop aria-hidden="true" className="size-5 text-violet-600" />
              <span className="mt-2 block text-sm font-semibold text-slate-900">
                Personal computer
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Employee installs the visible WorkPlus Agent.
              </span>
            </button> */}
            </div>
          </section>
          <section className={screen === "company" ? "mt-0" : "hidden"}>
            <p className="text-base font-medium text-slate-950">
              Download and install it on all employees&apos; computers.
            </p>
            <div className="mt-2 space-y-2">
              <button
                className="group flex w-full items-center gap-4 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-left text-slate-950 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                type="button"
              >
                <Monitor aria-hidden="true" className="size-7 text-current" />
                <span className="flex-1 text-lg font-semibold">Windows</span>
                <Download aria-hidden="true" className="size-5 text-current" />
              </button>
              <p className="pt-2 text-base font-medium text-slate-950">
                Read the instructions how to install it on employees&apos;
                computers.
              </p>
              <button
                className="group flex w-full items-center gap-4 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-left text-slate-950 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                type="button"
              >
                <Apple aria-hidden="true" className="size-7 text-current" />
                <span className="flex-1 text-lg font-semibold">macOS</span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 text-current"
                />
              </button>
              <button
                className="group flex w-full items-center gap-4 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-left text-slate-950 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                type="button"
              >
                <Laptop aria-hidden="true" className="size-7 text-current" />
                <span className="flex-1 text-lg font-semibold">Linux</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-950">
                  Beta
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 text-current"
                />
              </button>
            </div>
            <div className="my-3 flex items-center gap-3 text-sm font-medium text-slate-950 before:h-px before:flex-1 before:bg-slate-300 after:h-px after:flex-1 after:bg-slate-300">
              <span>OR</span>
            </div>
            <p className="text-base font-medium text-slate-950">
              Copy installation URL and send it to system administrators or
              employees.
            </p>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Company installation URL"
                className="form-control flex-1 border-slate-950 text-sm font-semibold text-slate-950"
                readOnly
                value={installationUrl}
              />
              <button
                className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-950 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={() => {
                  void copyInstallationUrl();
                }}
                type="button"
              >
                <Copy aria-hidden="true" className="size-4" />
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-950">
              <Info
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-slate-950"
              />
              <span>
                Employees will show up on your dashboard automatically after
                installation, no other sign ups are required.
              </span>
            </div>
          </section>
          <section className={screen === "personal" ? "mt-0" : "hidden"}>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[34%] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
                      Employee Email
                    </th>
                    <th className="w-[27%] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
                      Full Name
                    </th>
                    <th className="w-[27%] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
                      Team
                    </th>
                    <th className="w-14 border-b border-slate-200 px-2 py-3">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {personalRows.map((row, index) => (
                    <tr
                      className="border-b border-slate-100 last:border-b-0"
                      key={row.id}
                    >
                      <td className="px-4 py-2.5 align-top">
                        <input
                          aria-describedby={
                            personalRowErrors[row.id]?.email
                              ? `${row.id}-email-error`
                              : undefined
                          }
                          aria-invalid={Boolean(
                            personalRowErrors[row.id]?.email,
                          )}
                          aria-label={`Employee ${index + 1} email`}
                          className={`form-control h-14 rounded-xl border px-4 py-3 text-base focus:ring-1 ${personalRowErrors[row.id]?.email ? "border-red-500 focus:border-red-600 focus:ring-red-600" : "border-slate-300 focus:border-slate-950 focus:ring-slate-950"}`}
                          id={`${row.id}-email`}
                          onChange={(event) =>
                            updatePersonalRow(
                              index,
                              "email",
                              event.target.value,
                            )
                          }
                          placeholder="Enter email"
                          type="email"
                          value={row.email}
                        />
                        {personalRowErrors[row.id]?.email ? (
                          <p
                            className="mt-1.5 text-sm text-red-600"
                            id={`${row.id}-email-error`}
                          >
                            {personalRowErrors[row.id]?.email}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <input
                          aria-describedby={
                            personalRowErrors[row.id]?.fullName
                              ? `${row.id}-fullName-error`
                              : undefined
                          }
                          aria-invalid={Boolean(
                            personalRowErrors[row.id]?.fullName,
                          )}
                          aria-label={`Employee ${index + 1} full name`}
                          className={`form-control h-14 rounded-xl border px-4 py-3 text-base focus:ring-1 ${personalRowErrors[row.id]?.fullName ? "border-red-500 focus:border-red-600 focus:ring-red-600" : "border-slate-300 focus:border-slate-950 focus:ring-slate-950"}`}
                          id={`${row.id}-fullName`}
                          onChange={(event) =>
                            updatePersonalRow(
                              index,
                              "fullName",
                              event.target.value,
                            )
                          }
                          placeholder="Enter full name"
                          value={row.fullName}
                        />
                        {personalRowErrors[row.id]?.fullName ? (
                          <p
                            className="mt-1.5 text-sm text-red-600"
                            id={`${row.id}-fullName-error`}
                          >
                            {personalRowErrors[row.id]?.fullName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <div className="relative">
                          <select
                            aria-describedby={
                              personalRowErrors[row.id]?.teamId
                                ? `${row.id}-teamId-error`
                                : undefined
                            }
                            aria-invalid={Boolean(
                              personalRowErrors[row.id]?.teamId,
                            )}
                            aria-label={`Employee ${index + 1} team`}
                            className={`form-control h-14 w-full appearance-none rounded-xl border px-4 py-3 pr-14 text-base focus:ring-1 ${personalRowErrors[row.id]?.teamId ? "border-red-500 focus:border-red-600 focus:ring-red-600" : "border-slate-300 focus:border-slate-950 focus:ring-slate-950"}`}
                            id={`${row.id}-teamId`}
                            onChange={(event) =>
                              updatePersonalRow(
                                index,
                                "teamId",
                                event.target.value,
                              )
                            }
                            value={row.teamId}
                          >
                            <option value="">Choose team</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                          </select>
                          <ChevronDown
                            aria-hidden="true"
                            className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-slate-950"
                          />
                        </div>
                        {personalRowErrors[row.id]?.teamId ? (
                          <p
                            className="mt-1.5 text-sm text-red-600"
                            id={`${row.id}-teamId-error`}
                          >
                            {personalRowErrors[row.id]?.teamId}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <button
                          aria-label={`Remove employee ${index + 1}`}
                          className="grid size-10 place-items-center text-slate-400 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                          onClick={() => {
                            setPersonalRows((rows) =>
                              rows.length > 1
                                ? rows.filter(
                                    (_, rowIndex) => rowIndex !== index,
                                  )
                                : rows,
                            );
                            setPersonalRowErrors((current) => {
                              if (!current[row.id]) return current;
                              const next = { ...current };
                              delete next[row.id];
                              return next;
                            });
                          }}
                          type="button"
                        >
                          <X aria-hidden="true" className="size-7" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
              onClick={() => {
                nextPersonalRowId.current += 1;
                setPersonalRows((rows) => [
                  ...rows,
                  createPersonalInviteRow(nextPersonalRowId.current),
                ]);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className="size-6" />
              Add Another Employee
            </button>
          </section>
          <section className="hidden">
            <div className="grid grid-cols-[1.25fr_1fr_1fr_auto] gap-3 text-xs font-semibold text-slate-500">
              <span>Employee Email</span>
              <span>Full Name</span>
              <span>Team</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="mt-2 grid gap-3">
              <Field className="order-2" label="" required>
                <input
                  autoComplete="name"
                  className="form-control"
                  onChange={(event) => update("first", event.target.value)}
                  placeholder="e.g. Alex Johnson"
                  value={employee.first}
                />
              </Field>
              <Field
                className="order-1"
                label=""
                hint={
                  isPersonal
                    ? "An invitation will be sent to this address."
                    : "Used for notifications and ownership."
                }
                required={isPersonal}
              >
                <input
                  autoComplete="email"
                  className="form-control"
                  onChange={(event) => update("email", event.target.value)}
                  type="email"
                  value={employee.email}
                />
              </Field>
              <Field className="order-3" label="" required>
                <select
                  className="form-control"
                  onChange={(event) => update("team", event.target.value)}
                  value={employee.team}
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>
              </Field>
              <button
                aria-label="Clear employee row"
                className="order-4 mt-2 grid size-10 place-items-center self-start rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                onClick={() =>
                  onChange({ ...employee, first: "", email: "", team: "" })
                }
                type="button"
              >
                <X aria-hidden="true" className="size-6" />
              </button>
              <Field className="hidden" label="Role" required>
                <select
                  className="form-control"
                  onChange={(event) => update("role", event.target.value)}
                  value={employee.role}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </Field>
              <Field className="hidden" label="Shift">
                <select
                  className="form-control"
                  onChange={(event) => update("schedule", event.target.value)}
                  value={employee.schedule}
                >
                  <option>Morning · 08:00–17:00</option>
                  <option>Night · 20:00–05:00</option>
                  <option>Flexible</option>
                </select>
              </Field>
              <Field className="hidden" label="Timezone">
                <select
                  className="form-control"
                  onChange={(event) => update("timezone", event.target.value)}
                  value={employee.timezone}
                >
                  <option>UTC+06:30</option>
                  <option>UTC+00:00</option>
                  <option>UTC+07:00</option>
                  <option>UTC+08:00</option>
                  <option>UTC-05:00</option>
                </select>
              </Field>
            </div>
            <button
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              type="button"
            >
              <Plus aria-hidden="true" className="size-5" />
              Add Another Employee
            </button>
          </section>
          <section className="hidden">
            <div className="flex items-start gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
              />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  3. Privacy &amp; tracking policy
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Visible tracking runs only during the configured shift.
                  WorkPlus does not use hidden monitoring or collect keystrokes.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  <li>• Activity and work time during shift</li>
                  <li>• Agent connection and device status</li>
                  {employee.screenshots ? (
                    <li>• Screenshots (enabled by admin policy)</li>
                  ) : null}
                </ul>
                <div className="mt-3 space-y-2">
                  <Toggle
                    checked={employee.tracking}
                    label="Enable visible tracking"
                    onChange={(checked) => update("tracking", checked)}
                    subtext="The employee can see when tracking is active."
                  />
                  <Toggle
                    checked={employee.screenshots}
                    label="Allow screenshots"
                    onChange={(checked) => update("screenshots", checked)}
                    subtext="Optional; requires a separate policy and notice."
                  />
                  <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    <input
                      checked={employee.consent}
                      className="mt-0.5 size-4 accent-violet-600"
                      onChange={(event) =>
                        update("consent", event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      I confirm the employee will receive this Privacy Notice
                      and must accept it before tracking begins.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </section>
          {error || personalBatchError ? (
            <p
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {personalBatchError || error}
            </p>
          ) : null}
          <div
            className={
              screen === "selection"
                ? "hidden"
                : "mt-3 flex justify-between gap-2 border-t border-slate-100 pt-3"
            }
          >
            <button
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-950 bg-white px-5 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
              onClick={() =>
                screen === "selection"
                  ? onClose()
                  : setScreen(screen === "success" ? "personal" : "selection")
              }
              type="button"
            >
              {screen === "selection" ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Back
                </>
              )}
            </button>
            {screen === "personal" ? (
              <div className="flex gap-3">
                <button
                  className="rounded-xl border-2 border-slate-950 bg-white px-5 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <Button
                  className="bg-slate-950 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmittingPersonal}
                  onClick={() => {
                    void submitPersonalEmployees();
                  }}
                >
                  <MailCheck
                    aria-hidden="true"
                    className="mr-1 inline size-4"
                  />
                  {isSubmittingPersonal ? "Sending…" : "Send Invitations"}
                </Button>
              </div>
            ) : screen === "success" ? (
              <div className="flex gap-3">
                {invitationBatchResult?.summary.failed ? (
                  <button
                    className="rounded-xl border-2 border-slate-950 bg-white px-5 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmittingPersonal}
                    onClick={() => void retryFailedInvitations()}
                    type="button"
                  >
                    {isSubmittingPersonal ? "Retrying…" : "Retry failed"}
                  </button>
                ) : null}
                <Button
                  className="bg-slate-950 hover:bg-slate-800"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            ) : (
              <button
                className="rounded-xl border-2 border-slate-950 bg-white px-5 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  children,
  className = "",
  hint,
  label,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
  subtext,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  subtext: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{subtext}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-slate-300"}`}
      >
        <input
          aria-label={label}
          checked={checked}
          className="peer sr-only"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
