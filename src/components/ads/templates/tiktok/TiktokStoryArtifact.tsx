"use client";

import { useArtifact } from "@/components/ads/hooks/useArtifact";
import { TiktokAdStory } from "./TiktokAdStory";

export const TiktokStoryArtifact = () => {
  const { content } = useArtifact();
  return <TiktokAdStory content={content} />;
};
