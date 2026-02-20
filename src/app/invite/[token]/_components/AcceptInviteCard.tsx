"use client";

import { useState } from "react";
import { acceptWorkspaceInvitation } from "@/lib/actions/workspace-invitations";

interface AcceptInviteCardProps {
  token: string;
  isValid: boolean;
  errorMessage?: string;
  isAuthenticated: boolean;
  userEmail: string | null;
  emailMismatch: boolean;
  invitedEmail: string | null;
  workspaceName: string | null;
  inviterName: string | null;
  role: string | null;
}

export function AcceptInviteCard({
  token,
  isValid,
  errorMessage,
  isAuthenticated,
  userEmail,
  emailMismatch,
  invitedEmail,
  workspaceName,
  inviterName,
  role,
}: AcceptInviteCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(
    isValid ? null : (errorMessage ?? "Invalid invitation.")
  );

  async function handleAccept() {
    if (!isValid || accepting) return;

    setAccepting(true);
    setError(null);

    try {
      await acceptWorkspaceInvitation(token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setAccepting(false);
    }
  }

  function handleSignIn() {
    window.location.href = `/login?returnTo=/invite/${token}`;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 p-8 bg-card rounded-xl border border-border shadow-lg">
        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isValid ? "Workspace Invitation" : "Invalid Invitation"}
        </h1>

        {/* Invitation details */}
        {isValid && workspaceName ? (
          <div className="mb-6">
            <p className="text-muted-foreground">
              {inviterName} has invited you to join{" "}
              <span className="font-semibold text-foreground">
                {workspaceName}
              </span>{" "}
              as a {role}.
            </p>
          </div>
        ) : null}

        {/* Error message */}
        {error ? (
          <div className="mb-6 text-sm px-3 py-2 rounded-md text-destructive bg-destructive/10">
            {error}
          </div>
        ) : null}

        {/* Email mismatch warning */}
        {emailMismatch && isValid ? (
          <div className="mb-6 text-sm px-3 py-2 rounded-md text-amber-600 bg-amber-500/10">
            This invitation was sent to{" "}
            <span className="font-semibold">{invitedEmail}</span>, but
            you&apos;re signed in as{" "}
            <span className="font-semibold">{userEmail}</span>. Please sign
            in with the correct account.
          </div>
        ) : null}

        {/* Actions */}
        {isValid && isAuthenticated && !emailMismatch ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm cursor-pointer hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </button>
        ) : isValid && !isAuthenticated ? (
          <button
            onClick={handleSignIn}
            className="w-full py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm cursor-pointer hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            Sign In to Accept
          </button>
        ) : null}
      </div>
    </div>
  );
}
