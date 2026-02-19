"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GradientPage } from "@/components/ui/gradient-page";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInfoSection } from "./ProfileInfoSection";
import { AIPreferencesSection } from "./AIPreferencesSection";
import { WorkspacesSection } from "./WorkspacesSection";
import { InvitationsSection } from "./InvitationsSection";
import { PlanTierSection } from "./PlanTierSection";
import type { UserProfileWithWorkspaces } from "@/lib/types";

const TABS = ["profile", "billing"] as const;
type Tab = (typeof TABS)[number];

interface ProfileContentProps {
  profile: UserProfileWithWorkspaces;
}

export function ProfileContent({ profile }: ProfileContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "profile";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.push(`/profile${qs ? `?${qs}` : ""}`);
  };

  return (
    <GradientPage>
      <div className="container pt-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>
      </div>
      <PageHeader title="Your Profile" subtitle="Manage your account and preferences" />

      <section className="container">
        <div className="pb-12">
          <ProfileHeader profile={profile} />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="rounded-lg border border-border bg-card mt-3">
                <ProfileInfoSection profile={profile} />
                <AIPreferencesSection profile={profile} />
                <WorkspacesSection workspaces={profile.workspaces} />
                <InvitationsSection />
              </div>
            </TabsContent>

            <TabsContent value="billing">
              <div className="rounded-lg border border-border bg-card mt-3 p-6">
                <PlanTierSection />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </GradientPage>
  );
}
