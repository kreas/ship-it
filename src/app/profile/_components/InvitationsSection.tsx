"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Mail } from "lucide-react";

export function InvitationsSection() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-3">Invitations</h3>
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={<Mail className="w-6 h-6 text-muted-foreground" />}
          title="No pending invitations"
          description="You'll see workspace invitations here when someone invites you"
        />
      </div>
    </div>
  );
}
