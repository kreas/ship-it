import React from 'react';
import type { InstagramAdContent } from '../types';
import { instagramColors } from '../config';
import { getAspectRatioValue, type AspectRatio } from '@/components/ads/types/ContentData';
import { ArtifactMedia } from '@/components/ads/components/ArtifactMedia';

interface InstagramAdContentProps {
  mediaIndex?: number;
  aspectRatio?: AspectRatio;
  content: InstagramAdContent;
  style?: React.CSSProperties;
}

export function InstagramAdContent({ aspectRatio = '1:1', content, style, mediaIndex }: InstagramAdContentProps) {
  return (
    <div
      className="w-full"
      style={{
        backgroundColor: instagramColors.backgroundSecondary,
        aspectRatio: getAspectRatioValue(aspectRatio),
        ...style,
      }}
    >
      <ArtifactMedia
        prompt={content.prompt}
        altText={content.altText}
        aspectRatio={aspectRatio}
        mediaIndex={mediaIndex}
      />
    </div>
  );
}
