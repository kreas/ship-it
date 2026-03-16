import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  getWorkspaceSocialAccount,
  ensureValidToken,
} from "@/lib/actions/social-accounts";
import { getPlatformAdapter } from "@/lib/social/adapters";
import {
  PLATFORM_CONFIG,
  SUPPORTED_PLATFORMS,
} from "@/lib/social/constants";
import type { SocialPlatform } from "@/lib/types";

export interface SocialToolsContext {
  workspaceId: string;
}

/**
 * Create all social platform tools (discovery + execution).
 *
 * Design: All tools are always registered. Discovery tools guide the AI
 * to only call execution tools that are valid for the current workspace state.
 * Execution tools validate internally and return clear errors if not connected.
 */
export function createSocialTools(context: SocialToolsContext): ToolSet {
  const { workspaceId } = context;
  const tools: ToolSet = {};

  // Discovery tools — one per supported platform
  for (const platform of SUPPORTED_PLATFORMS) {
    const config = PLATFORM_CONFIG[platform];

    tools[platform] = tool({
      description: `Check this workspace's ${config.name} connection status and discover available actions. Call this FIRST before using any ${platform}_* tools.`,
      inputSchema: z.object({}),
      execute: async () => {
        return await discoverCapabilities(workspaceId, platform);
      },
    });
  }

  // Execution tools — Instagram
  tools.instagram_get_profile = tool({
    description:
      "Get the connected Instagram account profile info (username, bio, followers, etc.). Call the 'instagram' discovery tool first to verify connection.",
    inputSchema: z.object({}),
    execute: async () => {
      return await executeWithValidation(
        workspaceId,
        "instagram",
        async (accessToken) => {
          const adapter = getPlatformAdapter("instagram");
          const profile = await adapter.getUserProfile(accessToken);
          return { success: true, profile };
        }
      );
    },
  });

  tools.instagram_list_posts = tool({
    description:
      "List the workspace's recent Instagram posts with engagement metrics. Call the 'instagram' discovery tool first to verify connection.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of posts to fetch (default: 25, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    }),
    execute: async ({ limit, after }) => {
      return await executeWithValidation(
        workspaceId,
        "instagram",
        async (accessToken) => {
          const adapter = getPlatformAdapter("instagram");
          const result = await adapter.listPosts(accessToken, {
            limit: limit ?? 25,
            after,
          });
          return {
            success: true,
            posts: result.posts,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.posts.length,
          };
        }
      );
    },
  });

  tools.instagram_get_post = tool({
    description:
      "Get detailed information about a specific Instagram post by its platform post ID.",
    inputSchema: z.object({
      postId: z.string().describe("The Instagram post/media ID"),
    }),
    execute: async ({ postId }) => {
      return await executeWithValidation(
        workspaceId,
        "instagram",
        async (accessToken) => {
          const adapter = getPlatformAdapter("instagram");
          const post = await adapter.getPost(accessToken, postId);
          if (!post) {
            return { success: false, error: "Post not found" };
          }
          return { success: true, post };
        }
      );
    },
  });

  // Execution tools — Facebook
  tools.facebook_get_profile = tool({
    description:
      "Get the connected Facebook page profile info. Call the 'facebook' discovery tool first to verify connection.",
    inputSchema: z.object({}),
    execute: async () => {
      return await executeWithValidation(
        workspaceId,
        "facebook",
        async (accessToken) => {
          const adapter = getPlatformAdapter("facebook");
          const profile = await adapter.getUserProfile(accessToken);
          return { success: true, profile };
        }
      );
    },
  });

  tools.facebook_list_posts = tool({
    description:
      "List the workspace's recent Facebook page posts. Call the 'facebook' discovery tool first to verify connection.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of posts to fetch (default: 25, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    }),
    execute: async ({ limit, after }) => {
      return await executeWithValidation(
        workspaceId,
        "facebook",
        async (accessToken) => {
          const adapter = getPlatformAdapter("facebook");
          const result = await adapter.listPosts(accessToken, {
            limit: limit ?? 25,
            after,
          });
          return {
            success: true,
            posts: result.posts,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.posts.length,
          };
        }
      );
    },
  });

  tools.facebook_get_post = tool({
    description:
      "Get detailed information about a specific Facebook post by its platform post ID.",
    inputSchema: z.object({
      postId: z.string().describe("The Facebook post ID"),
    }),
    execute: async ({ postId }) => {
      return await executeWithValidation(
        workspaceId,
        "facebook",
        async (accessToken) => {
          const adapter = getPlatformAdapter("facebook");
          const post = await adapter.getPost(accessToken, postId);
          if (!post) {
            return { success: false, error: "Post not found" };
          }
          return { success: true, post };
        }
      );
    },
  });

  // Execution tools — LinkedIn
  tools.linkedin_get_profile = tool({
    description:
      "Get the connected LinkedIn account profile info. Call the 'linkedin' discovery tool first to verify connection.",
    inputSchema: z.object({}),
    execute: async () => {
      return await executeWithValidation(
        workspaceId,
        "linkedin",
        async (accessToken) => {
          const adapter = getPlatformAdapter("linkedin");
          const profile = await adapter.getUserProfile(accessToken);
          return { success: true, profile };
        }
      );
    },
  });

  tools.linkedin_list_posts = tool({
    description:
      "List the workspace's recent LinkedIn posts. Call the 'linkedin' discovery tool first to verify connection.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of posts to fetch (default: 25, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    }),
    execute: async ({ limit, after }) => {
      return await executeWithValidation(
        workspaceId,
        "linkedin",
        async (accessToken) => {
          const adapter = getPlatformAdapter("linkedin");
          const result = await adapter.listPosts(accessToken, {
            limit: limit ?? 25,
            after,
          });
          return {
            success: true,
            posts: result.posts,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.posts.length,
          };
        }
      );
    },
  });

  tools.linkedin_get_post = tool({
    description:
      "Get detailed information about a specific LinkedIn post by its platform post ID.",
    inputSchema: z.object({
      postId: z.string().describe("The LinkedIn post URN or ID"),
    }),
    execute: async ({ postId }) => {
      return await executeWithValidation(
        workspaceId,
        "linkedin",
        async (accessToken) => {
          const adapter = getPlatformAdapter("linkedin");
          const post = await adapter.getPost(accessToken, postId);
          if (!post) {
            return { success: false, error: "Post not found" };
          }
          return { success: true, post };
        }
      );
    },
  });

  // Execution tools — X (Twitter)
  tools.x_get_profile = tool({
    description:
      "Get the connected X (Twitter) account profile info. Call the 'x' discovery tool first to verify connection.",
    inputSchema: z.object({}),
    execute: async () => {
      return await executeWithValidation(
        workspaceId,
        "x",
        async (accessToken) => {
          const adapter = getPlatformAdapter("x");
          const profile = await adapter.getUserProfile(accessToken);
          return { success: true, profile };
        }
      );
    },
  });

  tools.x_list_posts = tool({
    description:
      "List the workspace's recent X (Twitter) posts/tweets. Call the 'x' discovery tool first to verify connection.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of posts to fetch (default: 25, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    }),
    execute: async ({ limit, after }) => {
      return await executeWithValidation(
        workspaceId,
        "x",
        async (accessToken) => {
          const adapter = getPlatformAdapter("x");
          const result = await adapter.listPosts(accessToken, {
            limit: limit ?? 25,
            after,
          });
          return {
            success: true,
            posts: result.posts,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.posts.length,
          };
        }
      );
    },
  });

  tools.x_get_post = tool({
    description:
      "Get detailed information about a specific X (Twitter) tweet by its ID.",
    inputSchema: z.object({
      postId: z.string().describe("The tweet ID"),
    }),
    execute: async ({ postId }) => {
      return await executeWithValidation(
        workspaceId,
        "x",
        async (accessToken) => {
          const adapter = getPlatformAdapter("x");
          const post = await adapter.getPost(accessToken, postId);
          if (!post) {
            return { success: false, error: "Post not found" };
          }
          return { success: true, post };
        }
      );
    },
  });

  // Execution tools — TikTok
  tools.tiktok_get_profile = tool({
    description:
      "Get the connected TikTok account profile info. Call the 'tiktok' discovery tool first to verify connection.",
    inputSchema: z.object({}),
    execute: async () => {
      return await executeWithValidation(
        workspaceId,
        "tiktok",
        async (accessToken) => {
          const adapter = getPlatformAdapter("tiktok");
          const profile = await adapter.getUserProfile(accessToken);
          return { success: true, profile };
        }
      );
    },
  });

  tools.tiktok_list_posts = tool({
    description:
      "List the workspace's recent TikTok videos. Call the 'tiktok' discovery tool first to verify connection.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of videos to fetch (default: 20, max: 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
    }),
    execute: async ({ limit, after }) => {
      return await executeWithValidation(
        workspaceId,
        "tiktok",
        async (accessToken) => {
          const adapter = getPlatformAdapter("tiktok");
          const result = await adapter.listPosts(accessToken, {
            limit: limit ?? 20,
            after,
          });
          return {
            success: true,
            posts: result.posts,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            count: result.posts.length,
          };
        }
      );
    },
  });

  tools.tiktok_get_post = tool({
    description:
      "Get detailed information about a specific TikTok video by its ID.",
    inputSchema: z.object({
      postId: z.string().describe("The TikTok video ID"),
    }),
    execute: async ({ postId }) => {
      return await executeWithValidation(
        workspaceId,
        "tiktok",
        async (accessToken) => {
          const adapter = getPlatformAdapter("tiktok");
          const post = await adapter.getPost(accessToken, postId);
          if (!post) {
            return { success: false, error: "Post not found" };
          }
          return { success: true, post };
        }
      );
    },
  });

  return tools;
}

/** Discovery: check connection and return capabilities */
async function discoverCapabilities(workspaceId: string, platform: string) {
  const config = PLATFORM_CONFIG[platform];
  const account = await getWorkspaceSocialAccount(
    workspaceId,
    platform as SocialPlatform
  );

  if (!account) {
    return {
      platform,
      connection_status: "not_connected",
      token_status: "missing",
      scopes: [],
      available_actions: [],
      blocked_actions: config.executionTools.map((action) => ({
        action,
        reason: "Account not connected to this workspace",
      })),
      ui_actions: [{ type: "connect_platform", platform }],
      recommended_next_step: `This workspace needs to connect a ${config.name} account. A "Connect ${config.name}" button should appear in the chat. Ask the user to click it.`,
    };
  }

  // Attempt to get a valid token (refreshes if expired)
  const validToken = await ensureValidToken(account.id);
  const scopes: string[] = JSON.parse(account.scopes);

  if (!validToken) {
    return {
      platform,
      connection_status: "expired",
      token_status: "expired",
      scopes,
      available_actions: [],
      blocked_actions: config.executionTools.map((action) => ({
        action,
        reason: "Token expired — needs to reconnect",
      })),
      ui_actions: [{ type: "reconnect_platform", platform }],
      recommended_next_step: `The workspace's ${config.name} token has expired. Ask the user to reconnect the account.`,
    };
  }

  return {
    platform,
    connection_status: "connected",
    token_status: "valid",
    username: account.platformUsername,
    scopes,
    available_actions: config.executionTools,
    blocked_actions: [],
    ui_actions: [],
    recommended_next_step: `${config.name} is connected as @${account.platformUsername}. You can now use: ${config.executionTools.join(", ")}`,
  };
}

/** Execution wrapper: validate connection before running action */
async function executeWithValidation(
  workspaceId: string,
  platform: string,
  action: (accessToken: string) => Promise<unknown>
) {
  const config = PLATFORM_CONFIG[platform];
  const account = await getWorkspaceSocialAccount(
    workspaceId,
    platform as SocialPlatform
  );

  if (!account) {
    return {
      success: false,
      error: `${config.name} account not connected to this workspace. Run the '${platform}' discovery tool first.`,
      ui_actions: [{ type: "connect_platform", platform }],
    };
  }

  const accessToken = await ensureValidToken(account.id);

  if (!accessToken) {
    return {
      success: false,
      error: `${config.name} token expired. User needs to reconnect.`,
      ui_actions: [{ type: "reconnect_platform", platform }],
    };
  }

  try {
    return await action(accessToken);
  } catch (error) {
    console.error(`[Social] ${platform} action failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
