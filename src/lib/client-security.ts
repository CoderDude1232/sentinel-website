"use client";

import { CSRF_COOKIE_NAME } from "@/lib/security-constants";

function readCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  const prefix = `${name}=`;
  const cookies = document.cookie.split(";");
  for (const entry of cookies) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      return decodeURIComponent(value);
    }
  }
  return "";
}

export function createTrustedHeaders(baseHeaders?: HeadersInit): Headers {
  const headers = new Headers(baseHeaders);
  headers.set("x-sentinel-client", "dashboard");
  const csrfToken = readCookie(CSRF_COOKIE_NAME);
  if (csrfToken) {
    headers.set("x-sentinel-csrf", csrfToken);
  }
  return headers;
}
