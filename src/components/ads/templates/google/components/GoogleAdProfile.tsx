import React, { type CSSProperties } from 'react';
import { z } from 'zod';
import { companySchema } from '../schema';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';
import { googleAdBranding, googleAdColors, googleAdFonts, googleAdLayout } from '../config';
import { RetryImage } from '@/components/ads/components/RetryImage';

interface GoogleAdProfileProps extends z.infer<typeof companySchema> {
  className?: string;
  style?: CSSProperties;
}

export default function GoogleAdProfile({ logo, name, url, className, style }: GoogleAdProfileProps) {
  return (
    <div className={cn('flex items-center gap-2', className)} style={style}>
      <RetryImage
        src={logo}
        alt={name}
        fallbackSrc={googleAdBranding.logoPlaceholder}
        className="rounded-full border object-contain object-center"
        style={{
          width: googleAdLayout.profile.width,
          height: googleAdLayout.profile.height,
          borderColor: googleAdColors.border,
        }}
      />
      <div>
        <h3 className="text-sm font-medium">{name}</h3>
        <div className="flex items-center" style={{ gap: googleAdLayout.spacing.md }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: googleAdFonts.fontSizes.sm }}>
            {url}
          </a>
          <MoreVertical className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
