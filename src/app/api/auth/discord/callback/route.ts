import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForAccessToken, fetchDiscordUser } from "@/lib/discord";
import {
  createSessionToken,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

function loginRedirect(request: NextRequest, error: string): URL {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
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
      maxAge: 0,
    });
    return response;
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(code);
    const user = await fetchDiscordUser(accessToken);
    const sessionToken = createSessionToken(user);

    const response = NextResponse.redirect(new URL("/app", request.url));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    const response = NextResponse.redirect(loginRedirect(request, "oauth_failed"));
    response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
