"use client";

import React from 'react';
import { useArtifact } from '@/components/ads/hooks/useArtifact';
import { useArtifactMedia } from '@/components/ads/hooks/useArtifactMedia';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ArtifactControlsRegenerateComponent = ({
  mediaIndex = 0,
  type = 'button',
}: {
  mediaIndex?: number;
  type?: 'button' | 'dropdown';
}) => {
  const { regenerate, isRegenerating, imageUrls, showVideo, currentIndex, currentImageUrl } =
    useArtifactMedia(mediaIndex);

  if (type === 'button') {
    return (
      <Button variant="ghost" size="icon" onClick={regenerate} disabled={isRegenerating} title="Regenerate">
        <RefreshCcw className="w-4 h-4" />
      </Button>
    );
  }

  const image = showVideo ? currentImageUrl : imageUrls?.[currentIndex] ?? null;
  return (
    <DropdownMenuItem onClick={regenerate} disabled={isRegenerating}>
      {image && <img src={image} alt="Image" className="w-8 h-8 rounded" />}
      <span className="text-sm truncate font-medium">Slide #{mediaIndex + 1}</span>
    </DropdownMenuItem>
  );
};

export const ArtifactControlsRegenerate = () => {
  const { mediaCount } = useArtifact();

  if (mediaCount === 1) return <ArtifactControlsRegenerateComponent />;
  if (mediaCount > 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Regenerate">
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {Array.from({ length: mediaCount }).map((_, mediaIndex) => (
            <ArtifactControlsRegenerateComponent mediaIndex={mediaIndex} type="dropdown" key={mediaIndex} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
};
