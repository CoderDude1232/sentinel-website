import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/security-constants";

const ONBOARDING_COOKIE_NAME = "sentinel_onboarding_complete";
const DEFAULT_MARKETING_HOST = "sentinelerlc.xyz";
const DEFAULT_DASHBOARD_HOST = "app.sentinelerlc.xyz";
const DEFAULT_API_HOST = "api.sentinelerlc.xyz";

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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = normalizeHost(request.headers.get("host"));
  const marketingHost = normalizeHost(process.env.NEXT_PUBLIC_MARKETING_HOST ?? DEFAULT_MARKETING_HOST);
  const dashboardHost = normalizeHost(process.env.NEXT_PUBLIC_DASHBOARD_HOST ?? DEFAULT_DASHBOARD_HOST);
  const apiHost = normalizeHost(process.env.NEXT_PUBLIC_API_HOST ?? DEFAULT_API_HOST);
  const hostSupportsRouting = Boolean(hostname);

  if (hostSupportsRouting && hostname === apiHost && !pathname.startsWith("/api")) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "API host only serves /api routes." },
        { status: 404 },
      ),
    );
  }

  if (hostSupportsRouting && hostname === dashboardHost) {
    if (pathname === "/" || pathname === "/features") {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      return withSecurityHeaders(NextResponse.redirect(url));
    }

    const allowedOnDashboardHost =
      pathname === "/login" ||
      pathname.startsWith("/app") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/access-denied");

    if (!allowedOnDashboardHost) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  if (
    hostSupportsRouting &&
    hostname === marketingHost &&
    dashboardHost &&
    dashboardHost !== marketingHost &&
    (pathname === "/login" || pathname.startsWith("/app"))
  ) {
    const url = request.nextUrl.clone();
    url.hostname = dashboardHost;
    url.port = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;
  const onboardingComplete = onboardingCookie === "1";

  if (
    pathname.startsWith("/app") &&
    hasSession &&
    !onboardingComplete &&
    pathname !== "/app/onboarding"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/onboarding";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (
    pathname.startsWith("/app") &&
    hasSession &&
    onboardingComplete &&
    pathname === "/app/onboarding"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const response = withSecurityHeaders(NextResponse.next());
  const hasCsrf = Boolean(request.cookies.get(CSRF_COOKIE_NAME)?.value);
  if (hasSession && !hasCsrf) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID().replaceAll("-", ""), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
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
