import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  createFeatureEntry,
  ensureWorkspaceSeed,
  isSupportedFeatureKey,
  listFeatureEntries,
  updateFeatureEntry,
} from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getFeatureKeyFromRequest(request: NextRequest): string | null {
  const feature = request.nextUrl.searchParams.get("feature")?.trim().toLowerCase();
  if (!feature || !isSupportedFeatureKey(feature)) {
    return null;
  }
  return feature;
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  const featureKey = getFeatureKeyFromRequest(request);
  if (!featureKey) {
    return NextResponse.json({ error: "Invalid feature key" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const items = await listFeatureEntries(user.id, featureKey);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feature data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    feature?: string;
    title?: string;
    status?: string;
    payload?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as {
      feature?: string;
      title?: string;
      status?: string;
      payload?: Record<string, unknown>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const featureKey = body.feature?.trim().toLowerCase() ?? "";
  if (!isSupportedFeatureKey(featureKey)) {
    return NextResponse.json({ error: "Invalid feature key" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const item = await createFeatureEntry({
      userId: user.id,
      featureKey,
      title: body.title,
      status: body.status?.trim() || "Active",
      payload: body.payload ?? {},
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create feature record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    id?: number;
    title?: string;
    status?: string;
    payload?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as {
      id?: number;
      title?: string;
      status?: string;
      payload?: Record<string, unknown>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const item = await updateFeatureEntry({
      userId: user.id,
      id: body.id,
      title: body.title,
      status: body.status,
      payload: body.payload,
    });
    if (!item) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update feature record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
