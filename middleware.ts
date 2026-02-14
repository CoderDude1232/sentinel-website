import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};

