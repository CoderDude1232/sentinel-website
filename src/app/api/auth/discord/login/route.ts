import { NextRequest, NextResponse } from "next/server";
import {
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  getSharedCookieDomain,
  shouldUseSecureCookies,
} from "@/lib/session";

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
  const cookieDomain = getSharedCookieDomain();
  const loginUrl = new URL("/login", resolveDashboardOrigin(request));
  loginUrl.searchParams.set("error", "login_intent_required");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
  });

  return response;
}
