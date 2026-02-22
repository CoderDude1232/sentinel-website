const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function extractHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  const withoutPath = trimmed.split("/")[0] ?? "";
  const host = withoutPath.split(":")[0]?.toLowerCase() ?? "";
  return host || null;
}

function toRootDomain(host: string): string | null {
  if (!host || host === "localhost" || IPV4_PATTERN.test(host)) {
    return null;
  }

  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  return parts.slice(-2).join(".");
}

export function getSharedCookieDomain(): string | undefined {
  const explicit = process.env.COOKIE_DOMAIN?.trim();
  if (explicit) {
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }

  const candidates = [
    process.env.NEXT_PUBLIC_DASHBOARD_HOST,
    process.env.NEXT_PUBLIC_API_HOST,
    process.env.NEXT_PUBLIC_MARKETING_HOST,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.DISCORD_REDIRECT_URI,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (!host) {
      continue;
    }
    const rootDomain = toRootDomain(host);
    if (rootDomain) {
      return `.${rootDomain}`;
    }
  }

  return undefined;
}
