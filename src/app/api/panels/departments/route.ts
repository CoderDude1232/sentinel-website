import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { fetchErlcStaff } from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { parseStaffItems } from "@/lib/erlc-normalize";
import { addDepartment, ensureWorkspaceSeed, getDepartments } from "@/lib/workspace-store";

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
    const [data, erlcKey] = await Promise.all([
      getDepartments(user.id),
      getUserErlcKey(user.id),
    ]);

    if (!erlcKey) {
      return NextResponse.json({
        ...data,
        prc: {
          connected: false,
          staff: [],
          count: 0,
          fetchedAt: null,
        },
      });
    }

    const staffResponse = await fetchErlcStaff(erlcKey.serverKey);
    const staff = parseStaffItems(staffResponse.data);
    return NextResponse.json({
      ...data,
      prc: {
        connected: true,
        staff: staff.slice(0, 60),
        count: staff.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load departments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { name?: string; lead?: string; members?: number; scope?: string };
  try {
    body = (await request.json()) as { name?: string; lead?: string; members?: number; scope?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.scope?.trim()) {
    return NextResponse.json({ error: "name and scope are required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const department = await addDepartment({
      userId: user.id,
      name: body.name,
      lead: body.lead?.trim() || user.displayName,
      members: Number(body.members ?? 0),
      scope: body.scope,
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create department";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
