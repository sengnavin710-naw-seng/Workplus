import { APP_NAME } from "@repo/shared";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

const configuredApiBaseUrl: unknown = Reflect.get(
  import.meta.env,
  "VITE_WORKPLUS_API_URL",
);
const apiBaseUrl =
  typeof configuredApiBaseUrl === "string"
    ? configuredApiBaseUrl
    : "http://localhost:3000";

type DeviceIdentity = {
  deviceName: string;
  platform: "windows" | "macos" | "linux";
  osVersion: string;
  agentVersion: string;
};
type Enrollment = {
  enrollmentId: string;
  pollToken: string;
  authorizationUrl: string;
};
type Policy = {
  id: string;
  name: string;
  version: number;
  noticeVersion: string;
  noticeText: string;
  applicationUsageEnabled: boolean;
  idleDetectionEnabled: boolean;
  screenshotsEnabled: boolean;
};
type EnrollmentStatus = {
  status:
    | "pending"
    | "consent_required"
    | "authorized"
    | "declined"
    | "completed"
    | "expired";
  employee: { name: string; organizationName: string } | null;
  policy: Policy | null;
};
type AgentPhase =
  | "loading"
  | "disconnected"
  | "waiting"
  | "consent"
  | "connecting"
  | "connected"
  | "revoked"
  | "error";

async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | null;
  if (!response.ok) {
    throw new Error(result?.message ?? "WorkPlus could not reach the server.");
  }
  return result as T;
}

export function App() {
  const [phase, setPhase] = useState<AgentPhase>("loading");
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [employee, setEmployee] =
    useState<EnrollmentStatus["employee"]>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [message, setMessage] = useState("");
  const credentialRef = useRef<string | null>(null);

  const heartbeat = useCallback(
    async (credential: string, currentIdentity: DeviceIdentity) => {
      try {
        const result = await apiRequest<{
          employee: { name: string; organizationName: string };
        }>("/api/agent/v1/devices/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${credential}` },
          body: JSON.stringify({
            agentVersion: currentIdentity.agentVersion,
            osVersion: currentIdentity.osVersion,
          }),
        });
        setEmployee(result.employee);
        setPhase("connected");
        setMessage("");
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Connection failed.";
        setPhase(/revoked|credential/i.test(detail) ? "revoked" : "error");
        setMessage(detail);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      invoke<DeviceIdentity>("get_device_identity"),
      invoke<string | null>("load_device_credential"),
    ])
      .then(([deviceIdentity, credential]) => {
        if (!active) return;
        setIdentity(deviceIdentity);
        credentialRef.current = credential;
        if (credential) void heartbeat(credential, deviceIdentity);
        else setPhase("disconnected");
      })
      .catch(() => {
        if (!active) return;
        setPhase("error");
        setMessage("The Agent could not access secure device storage.");
      });
    return () => {
      active = false;
    };
  }, [heartbeat]);

  useEffect(() => {
    if (phase !== "connected" || !identity) return;
    const interval = window.setInterval(() => {
      const credential = credentialRef.current;
      if (credential) void heartbeat(credential, identity);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [heartbeat, identity, phase]);

  const exchange = useCallback(async (current: Enrollment) => {
    setPhase("connecting");
    const result = await apiRequest<{ credential: string }>(
      `/api/agent/v1/enrollments/${current.enrollmentId}/exchange`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${current.pollToken}` },
      },
    );
    await invoke("store_device_credential", { value: result.credential });
    credentialRef.current = result.credential;
    setEnrollment(null);
    setPolicy(null);
    setPhase("connected");
  }, []);

  const checkEnrollment = useCallback(
    async (current: Enrollment) => {
      const result = await apiRequest<EnrollmentStatus>(
        `/api/agent/v1/enrollments/${current.enrollmentId}`,
        { headers: { Authorization: `Bearer ${current.pollToken}` } },
      );
      setEmployee(result.employee);
      if (result.status === "authorized") await exchange(current);
      else if (result.status === "consent_required" && result.policy) {
        setPolicy(result.policy);
        setPhase("consent");
      } else if (
        result.status === "expired" ||
        result.status === "declined"
      ) {
        setEnrollment(null);
        setPhase("disconnected");
        setMessage(
          result.status === "expired"
            ? "Authorization expired. Please try again."
            : "Consent was declined. This device was not connected.",
        );
      }
    },
    [exchange],
  );

  useEffect(() => {
    if (phase !== "waiting" || !enrollment) return;
    const interval = window.setInterval(
      () => void checkEnrollment(enrollment),
      2_000,
    );
    return () => window.clearInterval(interval);
  }, [checkEnrollment, enrollment, phase]);

  async function startEnrollment() {
    if (!identity) return;
    setMessage("");
    try {
      const result = await apiRequest<Enrollment>(
        "/api/agent/v1/enrollments",
        {
          method: "POST",
          headers: credentialRef.current
            ? { Authorization: `Bearer ${credentialRef.current}` }
            : undefined,
          body: JSON.stringify(identity),
        },
      );
      setEnrollment(result);
      setPhase("waiting");
      await invoke("open_authorization_url", {
        value: result.authorizationUrl,
      });
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Enrollment could not be started.",
      );
    }
  }

  async function respondToConsent(action: "accept" | "decline") {
    if (!enrollment) return;
    setPhase("connecting");
    try {
      const result = await apiRequest<{
        status: "authorized" | "declined";
      }>(`/api/agent/v1/enrollments/${enrollment.enrollmentId}/consent`, {
        method: "POST",
        headers: { Authorization: `Bearer ${enrollment.pollToken}` },
        body: JSON.stringify({ action }),
      });
      if (result.status === "authorized") await exchange(enrollment);
      else {
        setEnrollment(null);
        setPolicy(null);
        setPhase("disconnected");
        setMessage("Consent was declined. This device was not connected.");
      }
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Consent could not be saved.",
      );
    }
  }

  async function disconnect() {
    const credential = credentialRef.current;
    if (credential) {
      await apiRequest("/api/agent/v1/devices/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${credential}` },
      }).catch(() => null);
    }
    await invoke("delete_device_credential");
    credentialRef.current = null;
    setEmployee(null);
    setPhase("disconnected");
    setMessage("This device has been disconnected.");
  }

  return (
    <main className="agent-shell">
      <header>
        <p className="eyebrow">Visible desktop agent</p>
        <h1>{APP_NAME}</h1>
        <p className="intro">
          You can always see whether this Agent is connected and whether
          tracking is active.
        </p>
      </header>

      {phase === "consent" && policy ? (
        <Card className="consent-card">
          <div className="card-title">
            <span aria-hidden="true" className="status-icon">✓</span>
            <div>
              <p className="eyebrow">Privacy notice {policy.noticeVersion}</p>
              <h2>{policy.name}</h2>
            </div>
          </div>
          <p className="notice-text">{policy.noticeText}</p>
          <ul>
            <li>Tracking begins only after you clock in.</li>
            <li>Agent visibility and device status are always available.</li>
            <li>
              Application usage: {policy.applicationUsageEnabled ? "permitted by policy" : "not permitted"}
            </li>
            <li>
              Idle detection: {policy.idleDetectionEnabled ? "permitted by policy" : "not permitted"}
            </li>
            <li>
              Screenshots: {policy.screenshotsEnabled ? "permitted by policy" : "not permitted"}
            </li>
          </ul>
          <div className="actions">
            <button className="secondary-button" onClick={() => void respondToConsent("decline")} type="button">Decline</button>
            <Button onClick={() => void respondToConsent("accept")}>Accept &amp; Connect</Button>
          </div>
        </Card>
      ) : (
        <Card className="status-card">
          <div className="card-title">
            <span aria-hidden="true" className="status-icon">●</span>
            <h2>Agent status</h2>
          </div>
          <dl>
            <div><dt>Device</dt><dd>{identity?.deviceName ?? "Loading…"}</dd></div>
            <div><dt>Connection</dt><dd>{phaseLabel(phase)}</dd></div>
            <div><dt>Employee</dt><dd>{employee?.name ?? "Not connected"}</dd></div>
            <div><dt>Tracking</dt><dd className="tracking-off">Off</dd></div>
          </dl>
          {phase === "disconnected" || phase === "error" || phase === "revoked" ? (
            <Button onClick={() => void startEnrollment()}>Sign in with browser</Button>
          ) : null}
          {phase === "waiting" ? (
            <p className="notice" role="status">Complete sign-in in your browser. This window will update automatically.</p>
          ) : null}
          {phase === "connected" ? (
            <button className="disconnect-button" onClick={() => void disconnect()} type="button">Disconnect device</button>
          ) : null}
        </Card>
      )}
      {message ? <p className="message" role="status">{message}</p> : null}
      <p className="notice">
        No screenshots, application usage, website activity, or productivity
        data is collected in this phase.
      </p>
    </main>
  );
}

function phaseLabel(phase: AgentPhase) {
  return {
    loading: "Checking…",
    disconnected: "Not connected",
    waiting: "Waiting for browser",
    consent: "Consent required",
    connecting: "Connecting…",
    connected: "Connected",
    revoked: "Revoked",
    error: "Connection error",
  }[phase];
}
