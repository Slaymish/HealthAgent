import type { ReactNode } from "react";
import "./globals.css";
import Nav from "./components/nav";
import SyncButton from "./components/sync-button";

export const metadata = {
  title: "Health Insights Agent"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="top-bar">
            <div className="brand">
              <div className="brand-mark" />
              <div>
                <div className="brand-title">Health Agent</div>
                <div className="brand-subtitle">Personal health signal radar</div>
              </div>
            </div>
            <Nav />
            <div className="actions">
              <SyncButton />
              <div className="pill muted">Beta</div>
            </div>
          </header>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
