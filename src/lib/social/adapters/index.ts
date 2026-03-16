import type { PlatformAdapter } from "./types";
import { InstagramAdapter } from "./instagram";
import { FacebookAdapter } from "./facebook";
import { TikTokAdapter } from "./tiktok";
import { XAdapter } from "./x";
import { LinkedInAdapter } from "./linkedin";

export type {
  PlatformAdapter,
  OAuthTokens,
  PlatformPost,
  PlatformUserProfile,
  ListPostsOptions,
  ListPostsResult,
} from "./types";

const adapters: Record<string, () => PlatformAdapter> = {
  instagram: () => new InstagramAdapter(),
  facebook: () => new FacebookAdapter(),
  tiktok: () => new TikTokAdapter(),
  x: () => new XAdapter(),
  linkedin: () => new LinkedInAdapter(),
};

export function getPlatformAdapter(platform: string): PlatformAdapter {
  const factory = adapters[platform];
  if (!factory) {
    throw new Error(
      `Unsupported platform: ${platform}. Available: ${Object.keys(adapters).join(", ")}`
    );
  }
  return factory();
}

export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}
