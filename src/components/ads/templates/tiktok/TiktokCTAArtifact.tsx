"use client";

import { useArtifact } from "@/components/ads/hooks/useArtifact";
import { TiktokAdCTA } from "./TiktokAdCTA";

export const TiktokCTAArtifact = () => {
  const { content } = useArtifact();
  return <TiktokAdCTA content={content} />;
};
