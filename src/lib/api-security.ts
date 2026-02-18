import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/security-constants";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizedOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function addOrigin(origins: Set<string>, value: string | null | undefined) {
  if (!value) {
    return;
  }
  try {
    origins.add(normalizedOrigin(new URL(value).origin));
  } catch {
    // Ignore invalid origin values.
  }
}

function addOriginFromHost(origins: Set<string>, host: string | null | undefined, proto?: string | null) {
  if (!host) {
    return;
  }
  const trimmedHost = host.trim();
  if (!trimmedHost) {
    return;
  }

  if (proto) {
    addOrigin(origins, `${proto}://${trimmedHost}`);
  } else {
    addOrigin(origins, `https://${trimmedHost}`);
    addOrigin(origins, `http://${trimmedHost}`);
  }
}

function allowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  addOrigin(origins, request.nextUrl.origin);
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL?.trim());
  addOrigin(origins, process.env.APP_URL?.trim());

  addOriginFromHost(origins, request.headers.get("host"));

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim() || "https";
  addOriginFromHost(origins, forwardedHost, forwardedProto);

  return origins;
}

export function validateTrustedOrigin(
  request: NextRequest,
  options: { allowMissingHeaders?: boolean } = {},
): string | null {
  const allowMissingHeaders = options.allowMissingHeaders ?? false;
  const allowed = allowedOrigins(request);
  const isAllowed = (value: string): boolean => allowed.has(normalizedOrigin(value));

  const origin = request.headers.get("origin");
  if (origin && isAllowed(origin)) {
    return null;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (isAllowed(refererOrigin)) {
        return null;
      }
    } catch {
      return "Invalid request referer.";
    }
  }

  if (!origin && !referer) {
    if (allowMissingHeaders) {
      return null;
    }
    return "Missing request origin.";
  }
  if (origin && !isAllowed(origin)) {
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
