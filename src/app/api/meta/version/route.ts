import { NextResponse } from "next/server";
import packageJson from "../../../../../package.json";

export const dynamic = "force-dynamic";

function getDeploymentId(): string | null {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim();
  if (deploymentId) {
    return deploymentId;
  }
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (commitSha) {
    return commitSha;
  }
  return null;
}

export async function GET() {
  const version = `v${packageJson.version}`;
  const deploymentId = getDeploymentId();
  const release = deploymentId ? `${version}-${deploymentId}` : version;

  return NextResponse.json(
    {
      version,
      deploymentId,
      release,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
