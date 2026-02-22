import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokenBundle, fetchDiscordUser } from "@/lib/discord";
import { upsertDiscordOAuthToken } from "@/lib/discord-store";
import {
  createCsrfToken,
  createSessionToken,
  CSRF_COOKIE_NAME,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  getSharedCookieDomain,
  SESSION_COOKIE_NAME,
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

function loginRedirect(request: NextRequest, error: string): URL {
  const url = new URL("/login", resolveDashboardOrigin(request));
  url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  const cookieDomain = getSharedCookieDomain();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(loginRedirect(request, "invalid_state"));
    response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
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

  try {
    const tokenBundle = await exchangeCodeForTokenBundle(code);
    const user = await fetchDiscordUser(tokenBundle.accessToken);
    try {
      await upsertDiscordOAuthToken(user.id, tokenBundle);
    } catch {
      // OAuth token persistence is optional for login, but required for guild-based integrations.
    }
    const sessionToken = createSessionToken(user);

    const response = NextResponse.redirect(new URL("/app", resolveDashboardOrigin(request)));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
    });
    response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "strict",
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
    });
    response.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
      httpOnly: false,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    const response = NextResponse.redirect(loginRedirect(request, "oauth_failed"));
    response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
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
}
