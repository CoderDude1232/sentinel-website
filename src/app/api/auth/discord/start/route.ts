import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";
import { validateTrustedOrigin } from "@/lib/api-security";

function redirectToAccessDenied(request: NextRequest, reason: string) {
  const url = new URL("/access-denied", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const originError = validateTrustedOrigin(request);
  if (originError) {
    return redirectToAccessDenied(request, "oauth_intent");
  }

  const response = NextResponse.redirect(new URL("/api/auth/discord/login", request.url), 303);
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, createOAuthState(), {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 2,
  });
  return response;
}

export async function GET(request: NextRequest) {
  return redirectToAccessDenied(request, "oauth_intent");
}
