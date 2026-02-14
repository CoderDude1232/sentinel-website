import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function ProfilesPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Profiles"
      title="Staff Profiles and Trends"
      description="Maintain staff performance notes, trend observations, and profile-level review entries."
      featureKey="profiles"
      entryPlaceholder="Profile update title"
      payloadHint='{"staff":"Officer Name","score":"A-","trend":"improving"}'
    />
  );
}

