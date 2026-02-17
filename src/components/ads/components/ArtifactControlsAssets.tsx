"use client";

import React from 'react';
import { useArtifact } from '@/components/ads/hooks/useArtifact';
import { useArtifactMedia } from '@/components/ads/hooks/useArtifactMedia';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { ArtifactControlsAssetsDropdown } from './ArtifactControlsAssetsDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const ArtifactControlsMediaAssets = ({ mediaIndex = 0 }: { mediaIndex?: number }) => {
  const { imageUrls, showVideo, currentIndex, currentImageUrl } = useArtifactMedia(mediaIndex);
  const image = showVideo ? currentImageUrl : imageUrls?.[currentIndex] ?? null;

  return (
    <div className="text-sm px-2 py-2 flex items-center gap-2">
      {image && <img src={image} alt="Image" className="w-8 h-8 rounded" />}
      <span className="text-sm truncate font-medium">Slide #{mediaIndex + 1}</span>
      <ArtifactControlsAssetsDropdown mediaIndex={mediaIndex} />
    </div>
  );
};

export const ArtifactControlsAssets = () => {
  const { mediaCount } = useArtifact();
  if (mediaCount < 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Assets Versions">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {mediaCount === 1 && <ArtifactControlsAssetsDropdown mediaIndex={0} />}
        {mediaCount > 1 &&
          Array.from({ length: mediaCount }).map((_, mediaIndex) => (
            <ArtifactControlsMediaAssets mediaIndex={mediaIndex} key={mediaIndex} />
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
