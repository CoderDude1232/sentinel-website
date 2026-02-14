import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  shouldUseSecureCookies,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  clearSessionCookie(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  clearSessionCookie(response);
  return response;
}
