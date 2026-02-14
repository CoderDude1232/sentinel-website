import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function RealtimePage() {
  return (
    <AdvancedFeaturePanel
      kicker="Realtime"
      title="Realtime Channel Control"
      description="Track transport readiness, event-stream health, and realtime rollout entries."
      featureKey="realtime"
      entryPlaceholder="Realtime channel or rollout title"
      payloadHint='{"transport":"websocket","status":"healthy","fallback":"sse"}'
    />
  );
}

