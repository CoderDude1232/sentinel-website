import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  DISCORD_OAUTH_STATE_COOKIE_NAME,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";
import { validateTrustedOrigin } from "@/lib/api-security";
import { getDiscordAuthorizeUrl } from "@/lib/discord";

function redirectToAccessDenied(request: NextRequest, reason: string) {
  const url = new URL("/access-denied", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const originError = validateTrustedOrigin(request, { allowMissingHeaders: true });
  if (originError) {
    return redirectToAccessDenied(request, "oauth_intent");
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(getDiscordAuthorizeUrl(state), 303);
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

export async function GET(request: NextRequest) {
  return redirectToAccessDenied(request, "oauth_intent");
}
