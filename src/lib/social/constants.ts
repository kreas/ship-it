export const SUPPORTED_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "linkedin",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export const PLATFORM_CONFIG: Record<
  string,
  {
    name: string;
    icon: string;
    description: string;
    executionTools: string[];
  }
> = {
  instagram: {
    name: "Instagram",
    icon: "Instagram",
    description: "Access your Instagram posts, metrics, and content",
    executionTools: ["instagram_list_posts", "instagram_get_post"],
  },
  facebook: {
    name: "Facebook",
    icon: "Facebook",
    description: "Access your Facebook page posts, reactions, and engagement",
    executionTools: ["facebook_list_posts", "facebook_get_post"],
  },
  tiktok: {
    name: "TikTok",
    icon: "TikTok",
    description: "Access your TikTok videos, views, and engagement metrics",
    executionTools: ["tiktok_list_posts", "tiktok_get_post"],
  },
  x: {
    name: "X (Twitter)",
    icon: "X",
    description: "Access your tweets, impressions, and engagement metrics",
    executionTools: ["x_list_posts", "x_get_post"],
  },
  linkedin: {
    name: "LinkedIn",
    icon: "LinkedIn",
    description: "Access your LinkedIn posts and professional content",
    executionTools: ["linkedin_list_posts", "linkedin_get_post"],
  },
};
