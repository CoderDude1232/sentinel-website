import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function WorkflowsPage() {
  return (
    <AdvancedFeaturePanel
      kicker="Workflows"
      title="Case Workflow Automation"
      description="Define SLA timers, escalation routing, and reusable moderation/infraction workflow templates."
      featureKey="workflows"
      entryPlaceholder="Workflow template name"
      payloadHint='{"slaMinutes":20,"escalation":"Admin","steps":["triage","review","resolve"]}'
    />
  );
}

