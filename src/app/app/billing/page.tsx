import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function BillingPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Billing"
      title="Billing Readiness Workspace"
      description="Reserved area for subscriptions and seat billing if you decide to enable it later."
      featureKey="billing"
      entryPlaceholder="Billing plan note"
      payloadHint='{"status":"planned","seatModel":"per-user","provider":"tbd"}'
    />
  );
}

