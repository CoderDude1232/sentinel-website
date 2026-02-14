import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function TeamPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Teams"
      title="Team Workspace Management"
      description="Manage multi-account teams, invite flows, and ownership transfer records."
      featureKey="teams"
      entryPlaceholder="Team action title"
      payloadHint='{"team":"Primary Team","action":"invite","target":"Member#1234"}'
    />
  );
}
