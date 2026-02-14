import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function CommandsPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Commands"
      title="Safe ER:LC Command Controls"
      description="Manage allowlisted command actions and execution safety policies from dashboard workflows."
      featureKey="commands"
      entryPlaceholder="Command policy title"
      payloadHint='{"allowlist":[":announce",":pm"],"requiresApproval":true}'
    />
  );
}

