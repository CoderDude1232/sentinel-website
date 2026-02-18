import { NextRequest, NextResponse } from "next/server";
import {
  DISCORD_OAUTH_INTENT_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "login_intent_required");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
