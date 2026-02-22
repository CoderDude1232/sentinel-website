import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/security-constants";
import { getSharedCookieDomain } from "@/lib/cookie-domain";

const ONBOARDING_COOKIE_NAME = "sentinel_onboarding_complete";
const DEFAULT_MARKETING_HOST = "sentinelerlc.xyz";
const DEFAULT_DASHBOARD_HOST = "app.sentinelerlc.xyz";
const DEFAULT_API_HOST = "api.sentinelerlc.xyz";
const DASHBOARD_ROOT_SEGMENTS = new Set([
  "onboarding",
  "integrations",
  "settings",
  "moderation",
  "activity",
  "infractions",
  "sessions",
  "departments",
  "alerts",
  "team",
  "rbac",
  "workflows",
  "appeals",
  "profiles",
  "logs",
  "automation",
  "realtime",
  "commands",
  "backups",
  "api-keys",
  "observability",
  "billing",
]);

function normalizeHost(value: string | null): string {
  return (value ?? "").trim().toLowerCase().split(":")[0] ?? "";
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

function firstPathSegment(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "");
  const segment = trimmed.split("/")[0] ?? "";
  return segment.trim().toLowerCase();
}

function isDashboardModulePath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname === "/") {
    return false;
  }
  return DASHBOARD_ROOT_SEGMENTS.has(firstPathSegment(pathname));
}

function isDashboardHostBypassPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/access-denied") ||
    pathname === "/terms" ||
    pathname === "/privacy"
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sharedCookieDomain = getSharedCookieDomain();
  const hostname = normalizeHost(request.headers.get("host"));
  const marketingHost = normalizeHost(process.env.NEXT_PUBLIC_MARKETING_HOST ?? DEFAULT_MARKETING_HOST);
  const dashboardHost = normalizeHost(process.env.NEXT_PUBLIC_DASHBOARD_HOST ?? DEFAULT_DASHBOARD_HOST);
  const apiHost = normalizeHost(process.env.NEXT_PUBLIC_API_HOST ?? DEFAULT_API_HOST);
  const hostSupportsRouting = Boolean(hostname);
  const isDashboardHost = hostSupportsRouting && hostname === dashboardHost;
  let pendingDashboardRewrite: URL | null = null;

  if (hostSupportsRouting && hostname === apiHost) {
    if (pathname.startsWith("/auth/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/api${pathname}`;
      return withSecurityHeaders(NextResponse.rewrite(url));
    }
    if (!pathname.startsWith("/api")) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "API host only serves /api routes." },
          { status: 404 },
        ),
      );
    }
  }

  if (hostSupportsRouting && hostname === dashboardHost) {
    if (pathname === "/features") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return withSecurityHeaders(NextResponse.redirect(url));
    }

    if (pathname === "/app" || pathname.startsWith("/app/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/app" ? "/" : pathname.slice(4) || "/";
      url.search = "";
      return withSecurityHeaders(NextResponse.redirect(url));
    }

    if (!isDashboardHostBypassPath(pathname)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = pathname === "/" ? "/app" : `/app${pathname}`;
      pendingDashboardRewrite = rewriteUrl;
    }
  }

  if (
    hostSupportsRouting &&
    hostname === marketingHost &&
    dashboardHost &&
    dashboardHost !== marketingHost &&
    (pathname === "/login" || pathname.startsWith("/app") || isDashboardModulePath(pathname))
  ) {
    const url = request.nextUrl.clone();
    url.hostname = dashboardHost;
    url.port = "";
    if (pathname === "/app" || pathname.startsWith("/app/")) {
      url.pathname = pathname === "/app" ? "/" : pathname.slice(4) || "/";
    }
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const effectiveDashboardPath =
    pendingDashboardRewrite?.pathname ??
    (pathname.startsWith("/app") ? pathname : null);
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;
  const onboardingComplete = onboardingCookie === "1";

  if (
    effectiveDashboardPath?.startsWith("/app") &&
    hasSession &&
    !onboardingComplete &&
    effectiveDashboardPath !== "/app/onboarding"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = isDashboardHost ? "/onboarding" : "/app/onboarding";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (
    effectiveDashboardPath?.startsWith("/app") &&
    hasSession &&
    onboardingComplete &&
    effectiveDashboardPath === "/app/onboarding"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = isDashboardHost ? "/" : "/app";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const response = withSecurityHeaders(
    pendingDashboardRewrite ? NextResponse.rewrite(pendingDashboardRewrite) : NextResponse.next(),
  );
  const hasCsrf = Boolean(request.cookies.get(CSRF_COOKIE_NAME)?.value);
  if (hasSession && !hasCsrf) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID().replaceAll("-", ""), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: sharedCookieDomain,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
