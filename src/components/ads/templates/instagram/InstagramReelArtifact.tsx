"use client";

import { useState } from 'react';
import { InstagramAdActions } from './components/InstagramAdActions';
import { InstagramAdCaption } from './components/InstagramAdCaption';
import { InstagramAdCard } from './components/InstagramAdCard';
import { InstagramAdCTA } from './components/InstagramAdCTA';
import { InstagramAdGradient } from './components/InstagramAdGradient';
import { InstagramAdIcon } from './components/InstagramAdIcon';
import { InstagramAdProfile } from './components/InstagramAdProfile';
import { instagramBranding, instagramColors, instagramLayout } from './config';
import { useArtifact } from '@/components/ads/hooks/useArtifact';
import { useArtifactMedia } from '@/components/ads/hooks/useArtifactMedia';

interface InstagramReelArtifactProps {
  className?: string;
}

export function InstagramReelArtifact({ className }: InstagramReelArtifactProps) {
  const { artifact } = useArtifact();
  const { mediaUrl } = useArtifactMedia(0);

  const [expanded, setExpanded] = useState(false);
  const { profile, cta, caption, likes, comments } = artifact.content;

  return (
    <div className="h-full w-full">
      <InstagramAdCard className={`border-none p-0 relative h-full min-h-[700px] max-h-[800px] w-[450px] ${className}`}>
        <div
          className="absolute left-0 right-0 bottom-0 flex flex-row justify-end z-[2]"
          style={{
            gap: instagramLayout.spacingXXLarge,
            padding: instagramLayout.spacing,
          }}
        >
          <div className="flex flex-col justify-end flex-1" style={{ gap: instagramLayout.spacing }}>
            <InstagramAdProfile
              image={instagramBranding.logoPlaceholder}
              username={profile.username}
              style={{ color: instagramColors.background }}
            />
            <InstagramAdCaption
              name={profile.username}
              content={caption}
              showLikes={false}
              showUsername={false}
              style={{ color: instagramColors.background }}
              expanded={expanded}
              onExpand={setExpanded}
            />
            <InstagramAdCTA text={cta.text} url={cta.url} type="button" />
          </div>
          <div
            className="flex flex-col justify-end items-center"
            style={{ gap: instagramLayout.spacingXLarge, marginBottom: instagramLayout.spacingLarge }}
          >
            <InstagramAdActions
              className="flex-col"
              style={{ gap: instagramLayout.spacingXLarge }}
              showNumbers
              likes={likes}
              comments={comments}
              color={instagramColors.background}
            />
            <InstagramAdIcon name="meatball" color={instagramColors.background} />
          </div>
        </div>

        <div
          className="absolute left-0 right-0 bottom-0 top-0 bg-black bg-cover bg-center rounded-[5px]"
          style={{ backgroundImage: `url(${mediaUrl.currentImageUrl})` }}
        >
          {mediaUrl.showVideo && mediaUrl.videoUrls[mediaUrl.currentIndex] && (
            <video
              src={mediaUrl.videoUrls[mediaUrl.currentIndex]}
              className="w-full h-full object-cover rounded-[5px]"
              autoPlay
              muted
              loop
            />
          )}
        </div>
        <InstagramAdGradient direction="bottom" className="opacity-50" />
      </InstagramAdCard>
    </div>
  );
}
