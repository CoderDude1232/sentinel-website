import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/security-constants";

const ONBOARDING_COOKIE_NAME = "sentinel_onboarding_complete";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;
  const onboardingComplete = onboardingCookie === "1";

  if (!onboardingComplete && pathname !== "/app/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (onboardingComplete && pathname === "/app/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const hasCsrf = Boolean(request.cookies.get(CSRF_COOKIE_NAME)?.value);
  if (hasSession && !hasCsrf) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID().replaceAll("-", ""), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
