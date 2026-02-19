"use client";

import { GradientPage } from "@/components/ui/gradient-page";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInfoSection } from "./ProfileInfoSection";
import { AIPreferencesSection } from "./AIPreferencesSection";
import { WorkspacesSection } from "./WorkspacesSection";
import { InvitationsSection } from "./InvitationsSection";
import { PlanTierSection } from "./PlanTierSection";
import type { UserProfileWithWorkspaces } from "@/lib/types";

interface ProfileContentProps {
  profile: UserProfileWithWorkspaces;
}

export function ProfileContent({ profile }: ProfileContentProps) {
  return (
    <GradientPage>
      <PageHeader label="Profile" title="Your Profile" subtitle="Manage your account and preferences" />

      <section className="container">
        <div className="space-y-8 pb-12">
          <ProfileHeader profile={profile} />
          <ProfileInfoSection profile={profile} />
          <AIPreferencesSection profile={profile} />
          <PlanTierSection />
          <WorkspacesSection workspaces={profile.workspaces} />
          <InvitationsSection />
        </div>
      </section>
    </GradientPage>
  );
}
