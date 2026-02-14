import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function AutomationPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Automation"
      title="Session and Notification Automation"
      description="Configure announcements, reminder schedules, and automatic event handoffs."
      featureKey="automation"
      entryPlaceholder="Automation rule title"
      payloadHint='{"triggers":["session_created"],"actions":["discord_announce","staff_ping"]}'
    />
  );
}

