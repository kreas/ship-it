"use client";

import { useArtifact } from "@/components/ads/hooks/useArtifact";
import FacebookInStreamVideo from "./FacebookInStreamVideo";

export const FacebookInStreamVideoArtifact = () => {
  const { content } = useArtifact();
  return <FacebookInStreamVideo content={content} />;
};
