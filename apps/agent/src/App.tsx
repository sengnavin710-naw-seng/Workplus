import { APP_NAME } from "@repo/shared";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";

const statuses = [
  ["Agent installation", "Installed"],
  ["Server connection", "Not configured"],
  ["Device enrollment", "Not enrolled"],
] as const;

export function App() {
  return (
    <main className="agent-shell">
      <header>
        <p className="eyebrow">Windows desktop agent</p>
        <h1>{APP_NAME}</h1>
        <p className="intro">This application remains visible so employees can understand its status.</p>
      </header>

      <Card className="status-card">
        <h2>Agent status</h2>
        <dl>
          {statuses.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Button disabled>Start Tracking</Button>
      <p className="notice" role="status">Activity tracking is not implemented yet. No device activity is being collected or uploaded.</p>
    </main>
  );
}
