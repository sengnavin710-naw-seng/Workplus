"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { CheckCircle2, FileClock, Laptop, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DashboardShell } from "../../dashboard-shell";

type Policy = {
  id: string;
  name: string;
  version: number;
  status: "draft" | "published" | "retired";
  noticeVersion: string;
  noticeText: string;
  requiresConsent: boolean;
  applicationUsageEnabled: boolean;
  idleDetectionEnabled: boolean;
  screenshotsEnabled: boolean;
  effectiveAt: string | null;
};

type ConsentEmployee = {
  id: string;
  name: string;
  email: string | null;
  team: string;
  employeeStatus: string;
  consentStatus: "pending" | "accepted" | "declined" | "revoked";
  respondedAt: string | null;
};

type ManagedDevice = {
  id: string;
  name: string;
  platform: string;
  osVersion: string | null;
  agentVersion: string;
  status: "pending" | "active" | "revoked";
  connectionStatus: "online" | "offline" | "revoked";
  connectedAt: string | null;
  lastSeenAt: string | null;
  employee: { id: string; name: string; email: string | null };
};

const retentionCategories = [
  ["audit_logs", "Audit logs", 365],
  ["agent_events", "Agent events", 90],
  ["application_usage", "Application usage", 90],
  ["screenshots", "Screenshots", 30],
  ["time_entries", "Time entries", 730],
  ["aggregates", "Aggregates", 730],
] as const;

const emptyDraft = {
  name: "Personal computer privacy policy",
  noticeVersion: "1.0",
  noticeText:
    "WorkPlus will only collect the categories enabled in this policy after device enrollment. Activity collection is not available in the current phase.",
  requiresConsent: true,
  applicationUsageEnabled: false,
  idleDetectionEnabled: false,
  screenshotsEnabled: false,
};

export function PrivacyPage(props: {
  organizationName: string;
  role: string;
  userEmail: string;
  userName: string;
}) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [employees, setEmployees] = useState<ConsentEmployee[]>([]);
  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [retention, setRetention] = useState<Record<string, number>>(
    Object.fromEntries(retentionCategories.map(([key, , days]) => [key, days])),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [policyResponse, consentResponse, retentionResponse, deviceResponse] =
      await Promise.all([
        fetch("/api/privacy/policies", { cache: "no-store" }),
        fetch("/api/privacy/consents", { cache: "no-store" }),
        fetch("/api/privacy/retention", { cache: "no-store" }),
        fetch("/api/devices", { cache: "no-store" }),
      ]);
    if (
      !policyResponse.ok ||
      !consentResponse.ok ||
      !retentionResponse.ok ||
      !deviceResponse.ok
    ) {
      throw new Error("Privacy settings could not be loaded");
    }
    const policyData = (await policyResponse.json()) as {
      canManage: boolean;
      policies: Policy[];
    };
    const consentData = (await consentResponse.json()) as {
      employees: ConsentEmployee[];
    };
    const retentionData = (await retentionResponse.json()) as {
      policies: Array<{ dataCategory: string; retentionDays: number }>;
    };
    const deviceData = (await deviceResponse.json()) as {
      devices: ManagedDevice[];
    };
    setPolicies(policyData.policies);
    setEmployees(consentData.employees);
    setCanManage(policyData.canManage);
    setDevices(deviceData.devices);
    const editable = policyData.policies.find(
      (policy) => policy.status === "draft",
    );
    if (editable) {
      setDraftId(editable.id);
      setDraft({
        name: editable.name,
        noticeVersion: editable.noticeVersion,
        noticeText: editable.noticeText,
        requiresConsent: editable.requiresConsent,
        applicationUsageEnabled: editable.applicationUsageEnabled,
        idleDetectionEnabled: editable.idleDetectionEnabled,
        screenshotsEnabled: editable.screenshotsEnabled,
      });
    } else {
      setDraftId(null);
      setDraft(emptyDraft);
    }
    setRetention((current) => ({
      ...current,
      ...Object.fromEntries(
        retentionData.policies.map((policy) => [
          policy.dataCategory,
          policy.retentionDays,
        ]),
      ),
    }));
  }, []);

  useEffect(() => {
    load().catch((loadError: unknown) =>
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Privacy settings could not be loaded",
      ),
    );
  }, [load]);

  async function saveDraft() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        draftId ? `/api/privacy/policies/${draftId}` : "/api/privacy/policies",
        {
          method: draftId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message ?? "Policy could not be saved");
      setMessage("Draft policy saved.");
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Policy could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (
      !draftId ||
      !window.confirm(
        "Publish this policy? The current published version will be retired and employees must respond to the new version.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/privacy/policies/${draftId}/publish`, {
        method: "POST",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message ?? "Policy could not be published");
      setMessage("Policy published. Employees can now review it.");
      await load();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Policy could not be published",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveRetention() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/privacy/retention", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policies: retentionCategories.map(([dataCategory]) => ({
            dataCategory,
            retentionDays: retention[dataCategory],
          })),
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          data.message ?? "Retention settings could not be saved",
        );
      setMessage("Retention settings saved.");
      await load();
    } catch (retentionError) {
      setError(
        retentionError instanceof Error
          ? retentionError.message
          : "Retention settings could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revokeDevice(device: ManagedDevice) {
    if (
      !window.confirm(
        `Revoke ${device.name} for ${device.employee.name}? The Agent will lose access immediately.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/devices/${device.id}/revoke`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.message ?? "Device could not be revoked");
      }
      setMessage("Device access revoked.");
      await load();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Device could not be revoked",
      );
    } finally {
      setBusy(false);
    }
  }

  const published = policies.find((policy) => policy.status === "published");

  return (
    <DashboardShell activeNav="Settings" title="Privacy & Consent" {...props}>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <strong>Privacy gate:</strong> Publishing a policy does not start
        tracking. Device enrollment arrives in Phase 1B; time and activity
        collection remain disabled.
      </div>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-violet-50 text-violet-700">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Tracking policy draft</h2>
              <p className="mt-1 text-sm text-slate-500">
                Published versions are immutable. Save a new draft to change the
                notice.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Policy name">
              <Input
                disabled={!canManage}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </Field>
            <Field label="Notice version">
              <Input
                disabled={!canManage}
                value={draft.noticeVersion}
                onChange={(event) =>
                  setDraft({ ...draft, noticeVersion: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Employee privacy notice" className="mt-4">
            <textarea
              className="min-h-36 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-200 disabled:bg-slate-50"
              disabled={!canManage}
              value={draft.noticeText}
              onChange={(event) =>
                setDraft({ ...draft, noticeText: event.target.value })
              }
            />
          </Field>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={draft.requiresConsent}
              disabled={!canManage}
              label="Require explicit consent"
              onChange={(checked) =>
                setDraft({ ...draft, requiresConsent: checked })
              }
            />
            <Toggle
              checked={draft.applicationUsageEnabled}
              disabled={!canManage}
              label="Permit application usage (Phase 3)"
              onChange={(checked) =>
                setDraft({ ...draft, applicationUsageEnabled: checked })
              }
            />
            <Toggle
              checked={draft.idleDetectionEnabled}
              disabled={!canManage}
              label="Permit idle detection (Phase 3)"
              onChange={(checked) =>
                setDraft({ ...draft, idleDetectionEnabled: checked })
              }
            />
            <Toggle
              checked={draft.screenshotsEnabled}
              disabled={!canManage}
              label="Permit screenshots (Phase 5)"
              onChange={(checked) =>
                setDraft({ ...draft, screenshotsEnabled: checked })
              }
            />
          </div>
          {canManage ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void saveDraft()}>
                {draftId ? "Save draft" : "Create draft"}
              </Button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                disabled={!draftId || busy}
                onClick={() => void publishDraft()}
                type="button"
              >
                Publish policy
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              Managers may view privacy status but only owners and admins can
              change policy.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <FileClock aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Current policy</h2>
              <p className="mt-1 text-sm text-slate-500">
                The effective notice shown to employees.
              </p>
            </div>
          </div>
          {published ? (
            <dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {[
                ["Name", published.name],
                ["Version", String(published.version)],
                ["Notice", published.noticeVersion],
                [
                  "Effective",
                  published.effectiveAt
                    ? new Date(published.effectiveAt).toLocaleString()
                    : "—",
                ],
                [
                  "Consent",
                  published.requiresConsent ? "Required" : "Not required",
                ],
              ].map(([label, value]) => (
                <div
                  className="flex justify-between gap-4 px-3 py-3"
                  key={label}
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No policy has been published.
            </div>
          )}
          <h3 className="mt-6 text-sm font-bold">Version history</h3>
          <div className="mt-2 space-y-2">
            {policies.map((policy) => (
              <div
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                key={policy.id}
              >
                <span>
                  Version {policy.version} · {policy.name}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <FileClock aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">Retention settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Defines future maximum storage periods. It does not enable
              collection.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {retentionCategories.map(([key, label]) => (
            <Field key={key} label={`${label} (days)`}>
              <Input
                disabled={!canManage}
                min={1}
                max={3650}
                type="number"
                value={retention[key]}
                onChange={(event) =>
                  setRetention({
                    ...retention,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </Field>
          ))}
        </div>
        {canManage ? (
          <Button
            className="mt-5"
            disabled={busy}
            onClick={() => void saveRetention()}
          >
            Save retention
          </Button>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <Laptop aria-hidden="true" className="size-5 text-blue-600" />
          <div>
            <h2 className="font-bold">Connected devices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Heartbeat reports connection health only. Tracking remains off.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Connection</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Last seen</th>
                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-5 py-3"><strong>{device.name}</strong><span className="mt-0.5 block text-xs capitalize text-slate-500">{device.platform}</span></td>
                  <td className="px-5 py-3"><strong>{device.employee.name}</strong><span className="mt-0.5 block text-xs text-slate-500">{device.employee.email}</span></td>
                  <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">{device.connectionStatus}</span></td>
                  <td className="px-5 py-3 text-slate-600">{device.agentVersion}</td>
                  <td className="px-5 py-3 text-slate-500">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={busy || device.status === "revoked"}
                      onClick={() => void revokeDevice(device)}
                      type="button"
                    >
                      {device.status === "revoked" ? "Revoked" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {devices.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No devices have been connected.</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <CheckCircle2
            aria-hidden="true"
            className="size-5 text-emerald-600"
          />
          <div>
            <h2 className="font-bold">Employee consent</h2>
            <p className="mt-1 text-sm text-slate-500">
              Status for the latest policy version.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Team</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Responded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-5 py-3">
                    <strong className="block">{employee.name}</strong>
                    <span className="text-xs text-slate-500">
                      {employee.email}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{employee.team}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">
                      {employee.consentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {employee.respondedAt
                      ? new Date(employee.respondedAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No employees are available.
            </p>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Field({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label
      className={`block text-sm font-semibold text-slate-700 ${className}`}
    >
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
