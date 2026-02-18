import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/security-constants";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizedOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function expectedOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return request.nextUrl.origin;
    }
  }
  return request.nextUrl.origin;
}

export function validateTrustedOrigin(request: NextRequest): string | null {
  const expected = expectedOrigin(request);
  const origin = request.headers.get("origin");
  if (origin && normalizedOrigin(origin) === normalizedOrigin(expected)) {
    return null;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (normalizedOrigin(refererOrigin) === normalizedOrigin(expected)) {
        return null;
      }
    } catch {
      return "Invalid request referer.";
    }
  }

  if (!origin && !referer) {
    return "Missing request origin.";
  }
  if (origin && normalizedOrigin(origin) !== normalizedOrigin(expected)) {
    return "Invalid request origin.";
  }
  return "Invalid request referer.";
}

export function validateMutationRequest(
  request: NextRequest,
  options: { requireCsrf?: boolean; requireClientHeader?: boolean } = {},
): string | null {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return null;
  }

  const originError = validateTrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const requireClientHeader = options.requireClientHeader ?? true;
  if (requireClientHeader) {
    const clientHeader = request.headers.get("x-sentinel-client");
    if (clientHeader !== "dashboard") {
      return "Missing trusted client header.";
    }
  }

  const requireCsrf = options.requireCsrf ?? true;
  if (requireCsrf) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? "";
    const csrfHeader = request.headers.get("x-sentinel-csrf")?.trim() ?? "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return "Invalid CSRF token.";
    }
  }

  return null;
}

export function forbidden(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
