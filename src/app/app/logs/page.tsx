import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function LogsPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Logs"
      title="Command Log Explorer"
      description="Store saved filters, anomaly notes, and investigation entries for command-log analysis."
      featureKey="logs"
      entryPlaceholder="Saved view or investigation title"
      payloadHint='{"filters":{"actor":"*","command":":pm"},"anomaly":false}'
    />
  );
}

