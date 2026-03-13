import { redirect } from "next/navigation";
import { sealData } from "iron-session";
import { requireAuth } from "@/lib/actions/workspace";
import {
  getPlatformAdapter,
  getSupportedPlatforms,
} from "@/lib/social/adapters";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const user = await requireAuth();

  if (!getSupportedPlatforms().includes(platform)) {
    return new Response(`Unsupported platform: ${platform}`, { status: 400 });
  }

  const url = new URL(request.url);
  const returnUrl = url.searchParams.get("returnUrl") || "/";
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response("workspaceId is required", { status: 400 });
  }

  // Seal state for tamper protection (includes userId, workspaceId, platform, returnUrl)
  const state = await sealData(
    { userId: user.id, workspaceId, platform, returnUrl },
    { password: process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET! }
  );

  const adapter = getPlatformAdapter(platform);
  const authUrl = adapter.getAuthorizationUrl(state);

  return redirect(authUrl);
}
