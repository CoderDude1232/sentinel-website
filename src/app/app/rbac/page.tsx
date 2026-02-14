import { AdvancedFeaturePanel } from "@/components/advanced-feature-panel";

export default function RbacPage() {
  return (
    <AdvancedFeaturePanel
      kicker="RBAC"
      title="Roles and Permission Control"
      description="Create custom roles, permission bundles, and governance records for access decisions."
      featureKey="rbac"
      entryPlaceholder="Role profile or policy title"
      payloadHint='{"permissions":["moderation.view","alerts.manage"],"scope":"global"}'
    />
  );
}
