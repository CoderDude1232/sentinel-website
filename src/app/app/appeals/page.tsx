import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function AppealsPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Appeals"
      title="Appeals and Review Queue"
      description="Track submitted appeals, assign reviewers, and standardize appeal outcomes."
      featureKey="appeals"
      entryPlaceholder="Appeal case title"
      payloadHint='{"reviewer":"Owner","deadlineHours":48,"outcome":"pending"}'
    />
  );
}

