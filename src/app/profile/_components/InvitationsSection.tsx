"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Mail } from "lucide-react";

export function InvitationsSection() {
  return (
    <div>
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Invitations</h3>
      </div>
      <EmptyState
        icon={<Mail className="w-6 h-6 text-muted-foreground" />}
        title="No pending invitations"
        description="You'll see workspace invitations here when someone invites you"
      />
    </div>
  );
}
