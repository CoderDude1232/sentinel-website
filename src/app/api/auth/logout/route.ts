import { NextRequest, NextResponse } from "next/server";
import {
  CSRF_COOKIE_NAME,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  getSharedCookieDomain,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function clearSessionCookie(response: NextResponse) {
  const cookieDomain = getSharedCookieDomain();
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
    expires: new Date(0),
  });
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
    expires: new Date(0),
  });
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
    expires: new Date(0),
  });
}

function resolveDashboardOrigin(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }
  const dashboardHost = process.env.NEXT_PUBLIC_DASHBOARD_HOST?.trim();
  if (dashboardHost) {
    return `https://${dashboardHost}`;
  }
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname.startsWith("api.")) {
    return `${requestUrl.protocol}//app.${requestUrl.hostname.slice(4)}`;
  }
  return `${requestUrl.protocol}//${requestUrl.hostname}`;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", resolveDashboardOrigin(request)));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  clearSessionCookie(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  clearSessionCookie(response);
  return response;
}
