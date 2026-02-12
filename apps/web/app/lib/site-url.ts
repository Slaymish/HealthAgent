const LOCAL_DEV_SITE_URL = "http://localhost:3000";

function normalizeCandidate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol;
}

export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeCandidate(candidate);
    if (!normalized) {
      continue;
    }

    try {
      return new URL(normalized);
    } catch {
      // Ignore invalid candidate and keep trying fallbacks.
    }
  }

  return new URL(LOCAL_DEV_SITE_URL);
}

export function getAbsoluteUrl(pathname: string): string {
  return new URL(pathname, getSiteUrl()).toString();
}
