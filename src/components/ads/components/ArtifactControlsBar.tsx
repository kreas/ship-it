"use client";

import React from 'react';
import { useArtifact } from '@/components/ads/hooks/useArtifact';
import { useArtifactActions } from '@/components/ads/hooks/useArtifactActions';
import { RefreshCcw, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtifactControlsRegenerate } from './ArtifactControlsRegenerate';
import { ArtifactControlsImageToVideo } from './ArtifactControlsImageToVideo';
import { ArtifactControlsAssets } from './ArtifactControlsAssets';

type ArtifactControlsBarProps = {
  showMediaCount?: boolean;
};

const ArtifactControlsBar: React.FC<ArtifactControlsBarProps> = ({ showMediaCount = true }) => {
  const { name, imageCount, videoCount } = useArtifact();

  return (
    <div>
      <div className="flex justify-between items-center p-2 gap-4 w-full">
        <div className="flex-1 truncate" title={name}>
          <span className="text-sm text-muted-foreground truncate px-2 font-medium">{name}</span>
          {showMediaCount && (imageCount > 0 || videoCount > 0) && (
            <span className="text-xs text-muted-foreground ml-2 bg-muted px-2 py-1 rounded">
              {imageCount} images, {videoCount} videos
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ArtifactControlsRegenerate />
          <ArtifactControlsImageToVideo />
          <ArtifactControlsAssets />
        </div>
      </div>
    </div>
  );
};

export default ArtifactControlsBar;
