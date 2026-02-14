import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { addInfraction, createAlert, ensureWorkspaceSeed, getInfractions } from "@/lib/workspace-store";
import { verifyRobloxUsername } from "@/lib/roblox-api";
import {
  createAuditEvent,
  getInfractionPolicy,
  pointsForInfractionLevel,
  upsertInfractionPolicy,
} from "@/lib/ops-store";

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
    const [data, policy] = await Promise.all([
      getInfractions(user.id),
      getInfractionPolicy(user.id),
    ]);
    const totalPoints = data.cases.reduce(
      (sum, item) => sum + pointsForInfractionLevel(item.level, policy),
      0,
    );

    return NextResponse.json({
      ...data,
      policy,
      totals: {
        cases: data.cases.length,
        points: totalPoints,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load infractions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    warningPoints?: number;
    strikePoints?: number;
    suspensionPoints?: number;
    terminationPoints?: number;
    autoSuspendThreshold?: number;
    autoTerminationThreshold?: number;
  };

  try {
    body = (await request.json()) as {
      warningPoints?: number;
      strikePoints?: number;
      suspensionPoints?: number;
      terminationPoints?: number;
      autoSuspendThreshold?: number;
      autoTerminationThreshold?: number;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const previous = await getInfractionPolicy(user.id);
    const next = await upsertInfractionPolicy(user.id, {
      warningPoints: typeof body.warningPoints === "number" ? body.warningPoints : previous.warningPoints,
      strikePoints: typeof body.strikePoints === "number" ? body.strikePoints : previous.strikePoints,
      suspensionPoints: typeof body.suspensionPoints === "number" ? body.suspensionPoints : previous.suspensionPoints,
      terminationPoints: typeof body.terminationPoints === "number" ? body.terminationPoints : previous.terminationPoints,
      autoSuspendThreshold:
        typeof body.autoSuspendThreshold === "number"
          ? body.autoSuspendThreshold
          : previous.autoSuspendThreshold,
      autoTerminationThreshold:
        typeof body.autoTerminationThreshold === "number"
          ? body.autoTerminationThreshold
          : previous.autoTerminationThreshold,
    });

    await createAuditEvent({
      userId: user.id,
      module: "infractions",
      action: "policy.updated",
      actor: user.displayName,
      beforeState: previous,
      afterState: next,
    });

    return NextResponse.json({ policy: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update infraction policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { target?: string; level?: string; issuer?: string; appealStatus?: string; targetSource?: "online" | "offline" };
  try {
    body = (await request.json()) as { target?: string; level?: string; issuer?: string; appealStatus?: string; targetSource?: "online" | "offline" };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.target?.trim() || !body.level?.trim()) {
    return NextResponse.json({ error: "target and level are required" }, { status: 400 });
  }

  try {
    const verifiedTarget = await verifyRobloxUsername(body.target);
    if (!verifiedTarget) {
      return NextResponse.json(
        {
          error:
            body.targetSource === "online"
              ? "Selected online player could not be verified as a valid Roblox username."
              : "Offline player username is not a valid Roblox username.",
        },
        { status: 400 },
      );
    }

    await ensureWorkspaceSeed(user);
    const [policy, before] = await Promise.all([
      getInfractionPolicy(user.id),
      getInfractions(user.id),
    ]);
    const pointsAwarded = pointsForInfractionLevel(body.level, policy);
    const previousPoints = before.cases.reduce(
      (sum, item) => sum + pointsForInfractionLevel(item.level, policy),
      0,
    );

    const record = await addInfraction({
      userId: user.id,
      target: verifiedTarget.name,
      level: body.level,
      issuer: body.issuer?.trim() || user.displayName,
      appealStatus: body.appealStatus?.trim() || "Open",
    });
    const totalPoints = previousPoints + pointsAwarded;

    let thresholdAction: "none" | "auto_suspend_threshold" | "auto_termination_threshold" = "none";
    if (
      previousPoints < policy.autoTerminationThreshold &&
      totalPoints >= policy.autoTerminationThreshold
    ) {
      thresholdAction = "auto_termination_threshold";
      await createAlert({
        userId: user.id,
        level: "Critical",
        source: "Infractions",
        event: `Infraction points reached termination threshold (${totalPoints}). Review required.`,
      });
    } else if (
      previousPoints < policy.autoSuspendThreshold &&
      totalPoints >= policy.autoSuspendThreshold
    ) {
      thresholdAction = "auto_suspend_threshold";
      await createAlert({
        userId: user.id,
        level: "Warning",
        source: "Infractions",
        event: `Infraction points reached suspension threshold (${totalPoints}). Review required.`,
      });
    }

    await createAuditEvent({
      userId: user.id,
      module: "infractions",
      action: "case.created",
      actor: body.issuer?.trim() || user.displayName,
      subject: verifiedTarget.name,
      afterState: {
        caseRef: record.caseRef,
        level: record.level,
        pointsAwarded,
        totalPoints,
        thresholdAction,
      },
    });

    return NextResponse.json(
      { case: record, pointsAwarded, totalPoints, thresholdAction },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create infraction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
