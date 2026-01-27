"use client";

import { useSettingsContext } from "../context";
import { IntegrationRow } from "./_components/IntegrationRow";
import { ServerSearch } from "./_components/ServerSearch";

export default function IntegrationsSettingsPage() {
  const { mcpServers } = useSettingsContext();

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external tools to enhance AI assistant capabilities
        </p>
      </div>

      {/* Enabled Integrations */}
      {mcpServers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Enabled Integrations
          </h2>
          <div className="rounded-lg border border-border bg-card">
            {mcpServers.map((server) => (
              <IntegrationRow key={server.key} server={server} />
            ))}
          </div>
        </div>
      )}

      {/* Server Search */}
      <ServerSearch />
    </div>
  );
}
