# MCP Integration

This guide covers the Model Context Protocol (MCP) integration for adding external tool servers to workspaces.

## Overview

MCP (Model Context Protocol) is a standard for connecting AI models to external tools and data sources. This codebase supports HTTP-based MCP servers that can be enabled per workspace.

**MCP Specification:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

## Package

```json
{
  "@ai-sdk/mcp": "^1.0.13"
}
```

## Server Definitions

MCP servers are defined in `/src/lib/mcp/servers.ts`:

```typescript
export const MCP_SERVERS = {
  exa: {
    key: "exa",
    name: "Exa Search",
    description: "AI-powered web search for research and discovery",
    mcpUrl: "https://mcp.exa.ai",
    transportType: "http" as const,
    icon: "Search", // Lucide icon name
    requiresAuth: false,
  },
} as const;

export type McpServerKey = keyof typeof MCP_SERVERS;
```

### Server Definition Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique identifier |
| `name` | string | Display name |
| `description` | string | What the server provides |
| `mcpUrl` | string | Server endpoint URL |
| `transportType` | "http" \| "sse" | Transport protocol |
| `icon` | string | Lucide icon name |
| `requiresAuth` | boolean | Whether auth is required |

## Core Functions

Located in `/src/lib/mcp/index.ts`:

### `createMCPClient`

Create a connection to an MCP server:

```typescript
import { createMCPClient } from "@ai-sdk/mcp";

const client = await createMCPClient({
  transport: {
    type: "http",
    url: "https://mcp.example.com",
  },
});

const tools = await client.tools();
```

### `getToolsFromServer`

Get tools from a specific server:

```typescript
import { getToolsFromServer } from "@/lib/mcp";

const tools = await getToolsFromServer("exa");
// Returns ToolSet with server's available tools
```

### `getMcpToolsForWorkspace`

Get all tools from enabled servers for a workspace:

```typescript
import { getMcpToolsForWorkspace } from "@/lib/mcp";

const tools = await getMcpToolsForWorkspace(workspaceId);
// Returns merged ToolSet with prefixed tool names
```

Tool names are prefixed with the server key to avoid conflicts:
- `exa_search` instead of `search`
- `exa_find_similar` instead of `find_similar`

### `testServerConnection`

Test if a server is reachable:

```typescript
import { testServerConnection } from "@/lib/mcp";

const result = await testServerConnection("exa");
// { connected: true } or { connected: false, error: "message" }
```

### `getEnabledMcpServers`

Query enabled servers for a workspace from the database:

```typescript
import { getEnabledMcpServers } from "@/lib/mcp";

const servers = await getEnabledMcpServers(workspaceId);
// Returns array of enabled server records
```

## Adding a New MCP Server

1. **Add the server definition** in `/src/lib/mcp/servers.ts`:

```typescript
export const MCP_SERVERS = {
  // ... existing servers
  myServer: {
    key: "myServer",
    name: "My Server",
    description: "Description of what this server provides",
    mcpUrl: "https://mcp.myserver.com",
    transportType: "http" as const,
    icon: "Wrench",
    requiresAuth: false,
  },
} as const;
```

2. **Test the connection**:

```typescript
const result = await testServerConnection("myServer");
console.log(result.connected ? "Connected!" : result.error);
```

3. **Enable in a workspace** via the integrations UI or database.

## Usage in Chat

MCP tools are automatically loaded when `workspaceId` is passed to `createChatResponse`:

```typescript
import { createChatResponse } from "@/lib/chat";

return createChatResponse(messages, {
  system: "...",
  tools: { /* custom tools */ },
  workspaceId, // MCP tools loaded automatically
});
```

The chat module:
1. Fetches enabled servers from the database
2. Connects to each server and retrieves tools
3. Merges tools into the AI's tool set with prefixed names

## Database Schema

Enabled servers are tracked in the `workspaceMcpServers` table:

```typescript
// Simplified schema
{
  id: string,
  workspaceId: string,
  serverKey: string,      // Maps to MCP_SERVERS key
  isEnabled: boolean,
  createdAt: timestamp,
}
```

## Error Handling

MCP connections can fail. The implementation handles errors gracefully:

```typescript
try {
  const tools = await getToolsFromServer(serverKey);
} catch (error) {
  console.error(`Failed to get tools from ${serverKey}:`, error);
  return {}; // Continue without this server's tools
}
```

## Transport Notes

- **HTTP transport** is used for stateless request/response servers
- **SSE transport** is available for streaming servers (not currently used)
- Don't call `mcpClient.close()` for HTTP transport as it causes AbortError

## Key Files

| File | Purpose |
|------|---------|
| `/src/lib/mcp/index.ts` | Core MCP functions |
| `/src/lib/mcp/servers.ts` | Server definitions |

## Related Documentation

- [AI SDK Integration](./ai-sdk.md) - How MCP tools integrate with chat
