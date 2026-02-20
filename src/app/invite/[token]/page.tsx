import { getCurrentUser } from "@/lib/auth";
import { syncUserFromWorkOS } from "@/lib/actions/users";
import {
  getInvitationByToken,
  validateWorkspaceInvitation,
} from "@/lib/actions/workspace-invitations";
import { AcceptInviteCard } from "./_components/AcceptInviteCard";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Validate the invitation
  const { valid, errorMessage } = await validateWorkspaceInvitation(token);

  // Get invitation details for display
  const details = await getInvitationByToken(token);

  // Check if user is authenticated
  const authUser = await getCurrentUser();
  let isAuthenticated = false;
  let userEmail: string | null = null;
  let emailMismatch = false;

  if (authUser) {
    isAuthenticated = true;
    // Sync to DB to get latest status
    const dbUser = await syncUserFromWorkOS({
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName ?? null,
      lastName: authUser.lastName ?? null,
      avatarUrl: authUser.profilePictureUrl ?? null,
    });
    userEmail = dbUser.email;

    // Check email mismatch
    if (
      details &&
      dbUser.email.toLowerCase() !== details.invitation.email.toLowerCase()
    ) {
      emailMismatch = true;
    }
  }

  return (
    <AcceptInviteCard
      token={token}
      isValid={valid}
      errorMessage={errorMessage}
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      emailMismatch={emailMismatch}
      invitedEmail={details?.invitation.email ?? null}
      workspaceName={details?.workspaceName ?? null}
      inviterName={details?.inviterName ?? null}
      role={details?.invitation.role ?? null}
    />
  );
}
