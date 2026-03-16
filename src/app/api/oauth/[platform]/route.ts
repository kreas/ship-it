import { redirect } from "next/navigation";
import { sealData } from "iron-session";
import { requireWorkspaceAccess } from "@/lib/actions/workspace";
import {
  getPlatformAdapter,
  getSupportedPlatforms,
} from "@/lib/social/adapters";
import { generatePkce } from "@/lib/social/pkce";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (!getSupportedPlatforms().includes(platform)) {
    return new Response(`Unsupported platform: ${platform}`, { status: 400 });
  }

  const url = new URL(request.url);
  const returnUrl = url.searchParams.get("returnUrl") || "/";
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response("workspaceId is required", { status: 400 });
  }

  // Verify the user is a member of this workspace
  const { user } = await requireWorkspaceAccess(workspaceId);

  const statePayload: {
    userId: string;
    workspaceId: string;
    platform: string;
    returnUrl: string;
    codeVerifier?: string;
  } = { userId: user.id, workspaceId, platform, returnUrl };

  let pkce: { codeChallenge: string; codeChallengeMethod: "S256" } | undefined;
  if (platform === "tiktok") {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePkce();
    statePayload.codeVerifier = codeVerifier;
    pkce = { codeChallenge, codeChallengeMethod };
  }

  const state = await sealData(statePayload, {
    password: process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET!,
  });

  const adapter = getPlatformAdapter(platform);
  const authUrl = adapter.getAuthorizationUrl(state, pkce);

  return redirect(authUrl);
}
