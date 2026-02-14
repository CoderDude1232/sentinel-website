import { ErlcPanel } from "@/components/integrations/erlc-panel";
import { DiscordBotPanel } from "@/components/integrations/discord-bot-panel";

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <ErlcPanel />
      <DiscordBotPanel />
    </div>
  );
}
