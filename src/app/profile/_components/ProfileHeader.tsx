"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfileWithWorkspaces } from "@/lib/types";

interface ProfileHeaderProps {
  profile: UserProfileWithWorkspaces;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User";
  const initials = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-5">
        <Avatar className="w-20 h-20">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Member since{" "}
            {new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
