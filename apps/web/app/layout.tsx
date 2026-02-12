import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/nav";
import Providers from "./providers";
import UserGreeting from "./components/user-greeting";
import { getAbsoluteUrl, getSiteUrl } from "./lib/site-url";

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

const siteUrl = getSiteUrl();
const siteDescription =
  "HealthAgent turns Apple Health exports into weekly trend signals, pipeline-backed summaries, and clear next actions.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "HealthAgent | Apple Health trend and insight dashboard",
    template: "%s | HealthAgent"
  },
  description: siteDescription,
  applicationName: "HealthAgent",
  category: "HealthApplication",
  keywords: [
    "apple health dashboard",
    "health data trends",
    "weekly health insights",
    "health auto export",
    "personal health metrics"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    siteName: "HealthAgent",
    title: "HealthAgent | Apple Health trend and insight dashboard",
    description: siteDescription,
    url: getAbsoluteUrl("/"),
    images: [
      {
        url: getAbsoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "HealthAgent dashboard preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "HealthAgent | Apple Health trend and insight dashboard",
    description: siteDescription,
    images: [getAbsoluteUrl("/twitter-image")]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HealthAgent",
  url: getAbsoluteUrl("/"),
  description: siteDescription
};

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "HealthAgent",
  url: getAbsoluteUrl("/"),
  description: siteDescription,
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  featureList: [
    "Ingest Apple Health Auto Export JSON files",
    "Compute daily and weekly health trend metrics",
    "Generate weekly insight summaries from pipeline runs",
    "Highlight freshness and missing-day data quality checks"
  ]
};

function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webApplicationJsonLd) }}
        />
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
