import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { ensureWorkspaceSeed, getOnboardingSummary } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const steps = await getOnboardingSummary(user.id);
    return NextResponse.json({ steps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load onboarding summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
