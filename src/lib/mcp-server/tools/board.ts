import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatToolError } from "@/lib/mcp-server/errors";
import type { MCPAuthContext } from "@/lib/mcp-server/services/auth-context";
import { getBoardOverview } from "@/lib/mcp-server/services/board";

export function registerBoardTools(server: McpServer, ctx: MCPAuthContext) {
  server.tool(
    "get-board-overview",
    "Get a board overview for the connected workspace: columns with issues, labels, and cycles",
    {},
    async () => {
      try {
        const result = await getBoardOverview(ctx);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}
