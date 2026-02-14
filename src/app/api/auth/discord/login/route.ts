import { NextResponse } from "next/server";
import { getDiscordAuthorizeUrl } from "@/lib/discord";
import {
  createOAuthState,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

export async function GET() {
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

  return response;
}
