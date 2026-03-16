"use client";

import { ExternalLink } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

interface SocialConnectPromptProps {
  platform: string;
  isReconnect?: boolean;
  workspaceId?: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  tiktok: "TikTok",
};

export function SocialConnectPrompt({
  platform,
  isReconnect,
  workspaceId,
}: SocialConnectPromptProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const platformName = PLATFORM_NAMES[platform] ?? platform;
  const label = isReconnect
    ? `Reconnect ${platformName}`
    : `Connect ${platformName}`;

  const handleConnect = () => {
    const oauthParams = new URLSearchParams({
      returnUrl,
      ...(workspaceId && { workspaceId }),
    });
    window.location.href = `/api/oauth/${platform}?${oauthParams}`;
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <button
        onClick={handleConnect}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        {label}
      </button>
    </div>
  );
}
