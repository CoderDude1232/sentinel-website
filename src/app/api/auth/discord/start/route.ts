import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  getSharedCookieDomain,
  shouldUseSecureCookies,
} from "@/lib/session";
import { getDiscordAuthorizeUrl } from "@/lib/discord";

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

function redirectToAccessDenied(request: NextRequest, reason: string) {
  const url = new URL("/access-denied", resolveDashboardOrigin(request));
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function POST() {
  const cookieDomain = getSharedCookieDomain();
  const state = createOAuthState();
  const response = NextResponse.redirect(getDiscordAuthorizeUrl(state), 303);
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 10,
  });
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

export async function GET(request: NextRequest) {
  return redirectToAccessDenied(request, "oauth_intent");
}
