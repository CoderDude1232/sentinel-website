import { NextRequest, NextResponse } from "next/server";
import { getDiscordAuthorizeUrl } from "@/lib/discord";
import {
  createOAuthState,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  const intentCookie = request.cookies.get(DISCORD_OAUTH_INTENT_COOKIE_NAME)?.value;

  if (!intentCookie) {
    const deniedUrl = new URL("/access-denied", request.url);
    deniedUrl.searchParams.set("reason", "oauth_intent");
    const response = NextResponse.redirect(deniedUrl);
    response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const state = createOAuthState();
  const redirectUrl = getDiscordAuthorizeUrl(state);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
