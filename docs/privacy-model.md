# Privacy model

The platform begins with these non-negotiable principles:

- No hidden monitoring or stealth behavior.
- No keylogging or password collection.
- Tracking status must always be visible to the employee.
- Data retention must be configurable and enforceable.
- Sensitive information must use role-based access controls.
- Access to sensitive data must be audit logged.
- Employees must receive clear notification and any consent required by policy or law.
- Collect the minimum data needed for an explicitly stated purpose.

The current Agent uploads only its visible connection heartbeat, operating-system label, and Agent version after enrollment. It collects and uploads no screenshots, application usage, website activity, keystrokes, clipboard content, or productivity data.

## Current privacy gate

Organizations can create immutable versioned tracking policies, configure retention periods, and publish one effective policy at a time. Employees see the current notice in their portal and may accept, decline, or revoke consent. Responses are tied to the exact policy version, and policy or consent changes create append-only audit events.

These controls do not enable activity collection. Device enrollment is gated by the current published policy and server-side consent. Connecting an Agent leaves tracking off. Visible clock-in follows in Phase 2, and application usage or idle intervals remain deferred until their policy-controlled collection phase.
