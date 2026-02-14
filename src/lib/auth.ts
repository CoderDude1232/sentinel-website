import { NextRequest } from "next/server";
import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "@/lib/session";

export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionToken(token);
  return session?.user ?? null;
}
