import { redirect } from "next/navigation";
import { unsealData } from "iron-session";
import { getPlatformAdapter } from "@/lib/social/adapters";
import {
  createSocialAccount,
  getWorkspaceSocialAccount,
  updateSocialAccountTokens,
} from "@/lib/actions/social-accounts";
import type { SocialPlatform } from "@/lib/types";

interface OAuthState {
  userId: string;
  workspaceId: string;
  platform: string;
  returnUrl: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors from the provider
  if (error) {
    const errorDesc =
      url.searchParams.get("error_description") || error;
    return redirect(`/?oauth_error=${encodeURIComponent(errorDesc)}`);
  }

  if (!code || !state) {
    return redirect("/?oauth_error=missing_params");
  }

  // Unseal state to recover userId, workspaceId, and returnUrl
  let stateData: OAuthState;
  try {
    stateData = await unsealData<OAuthState>(state, {
      password: process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET!,
    });
  } catch {
    return redirect("/?oauth_error=invalid_state");
  }

  if (stateData.platform !== platform) {
    return redirect("/?oauth_error=state_mismatch");
  }

  try {
    const adapter = getPlatformAdapter(platform);

    // Exchange authorization code for tokens
    const tokens = await adapter.exchangeCode(code);

    // Get user profile from the platform
    const profile = await adapter.getUserProfile(tokens.accessToken);

    // Check if this workspace already has a connection for this platform (reconnect)
    const existing = await getWorkspaceSocialAccount(
      stateData.workspaceId,
      platform as SocialPlatform
    );

    if (existing) {
      await updateSocialAccountTokens(existing.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        platformUserId: profile.platformUserId,
        platformUsername: profile.username,
      });
    } else {
      await createSocialAccount({
        workspaceId: stateData.workspaceId,
        userId: stateData.userId,
        platform: platform as SocialPlatform,
        platformUserId: profile.platformUserId,
        platformUsername: profile.username,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
      });
    }

    // Redirect back with success param
    const returnUrl = new URL(stateData.returnUrl, url.origin);
    returnUrl.searchParams.set("oauth_success", platform);
    return redirect(returnUrl.toString());
  } catch (err) {
    console.error(`[OAuth] ${platform} callback error:`, err);
    const errorMessage =
      err instanceof Error ? err.message : "OAuth callback failed";
    return redirect(
      `${stateData.returnUrl}?oauth_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
