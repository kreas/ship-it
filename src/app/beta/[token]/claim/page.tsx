import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { validateInviteCode } from "@/lib/actions/invite-codes";
import { syncUserFromWorkOS } from "@/lib/actions/users";
import { ClaimCard } from "./_components/ClaimCard";

interface ClaimPageProps {
  params: Promise<{ token: string }>;
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;

  // Check auth first so we can pass userId to validation
  const authUser = await getCurrentUser();
  let isAuthenticated = false;

  if (authUser) {
    isAuthenticated = true;
    // Sync to DB to get status
    const dbUser = await syncUserFromWorkOS({
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName ?? null,
      lastName: authUser.lastName ?? null,
      avatarUrl: authUser.profilePictureUrl ?? null,
    });

    if (dbUser.status === "active") {
      redirect("/projects");
    }
  }

  // Validate the invite code (with userId for duplicate claim detection)
  const { valid, errorMessage } = await validateInviteCode(
    token,
    authUser?.id
  );

  return (
    <ClaimCard
      token={token}
      isValid={valid}
      errorMessage={errorMessage}
      isAuthenticated={isAuthenticated}
    />
  );
}
