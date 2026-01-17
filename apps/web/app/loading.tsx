import { Card } from "./components/ui";

export default function AppLoading() {
  return (
    <div className="section">
      <div className="page-heading">
        <div>
          <h1>Loading…</h1>
          <p className="muted">Fetching the latest signals.</p>
        </div>
      </div>
      <Card title="Preparing view">
        <p className="muted">Almost there.</p>
      </Card>
    </div>
  );
}
