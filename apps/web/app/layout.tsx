import type { ReactNode } from "react";
import "./globals.css";
import Nav from "./components/nav";
import Providers from "./providers";
import UserGreeting from "./components/user-greeting";

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('health-agent-theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored === 'light' || stored === 'dark' ? stored : system;
    document.documentElement.dataset.theme = theme;
  } catch (err) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export const metadata = {
  title: "Health Insights Agent"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          <div className="app-shell">
            <div className="top-bar-wrap">
              <header className="top-bar">
                <div className="brand">
                  <svg
                    className="brand-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3 a9 9 0 1 1 -6.36 2.64" />
                    <circle cx="16.5" cy="7.5" r="1.5" />
                  </svg>
                  <div>
                    <div className="brand-title">Health Agent</div>
                    <div className="brand-subtitle">Decide what to do next</div>
                  </div>
                </div>
                <Nav />
                <div className="actions">
                  <UserGreeting />
                </div>
              </header>
            </div>
            <main className="page">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
