import React from 'react';
import { tiktokAdLayout, tiktokColors } from '../config';

export interface TiktokAdProfileProps {
  image: string;
}

export const TiktokAdProfile = ({ image }: TiktokAdProfileProps) => {
  return (
    <div
      className="flex items-center gap-2 rounded-full border"
      style={{
        width: tiktokAdLayout.profile.width,
        height: tiktokAdLayout.profile.height,
        borderColor: tiktokColors.border,
        backgroundColor: tiktokColors.backgroundGray,
      }}
    >
      <img src={image} alt="profile" className="w-full h-full rounded-full object-cover object-center" />
    </div>
  );
};
