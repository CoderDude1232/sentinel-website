import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function ApiKeysPage() {
  return (
    <AdvancedFeaturePanel
      kicker="API Keys"
      title="Sentinel API Token Management"
      description="Create scoped token records for third-party integrations and internal automation."
      featureKey="api_keys"
      entryPlaceholder="API token profile title"
      payloadHint='{"scopes":["read:dashboard","write:alerts"],"rotationDays":30}'
    />
  );
}

