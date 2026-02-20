"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../db";
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces,
  users,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWorkspaceAccess } from "./workspace";
import { sendWorkspaceInviteEmail } from "../email/send-workspace-invite";
import type { WorkspaceInvitation } from "../types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Create a workspace invitation and send email.
 * Revokes any existing pending invite for the same email+workspace.
 */
export async function createWorkspaceInvitation(
  workspaceId: string,
  email: string,
  role: string = "member"
): Promise<WorkspaceInvitation> {
  const { user, workspace } = await requireWorkspaceAccess(
    workspaceId,
    "admin"
  );

  // Revoke any existing pending invitation for this email+workspace
  await db
    .update(workspaceInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.email, email),
        eq(workspaceInvitations.status, "pending")
      )
    );

  // Create new invitation with 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId,
      email,
      role,
      invitedBy: user.id,
      expiresAt,
    })
    .returning();

  // Send email
  const inviterName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  await sendWorkspaceInviteEmail({
    to: email,
    token: invitation.token,
    workspaceName: workspace.name,
    inviterName,
    role,
  });

  revalidatePath(`/w/${workspace.slug}/settings/members`);

  return invitation;
}

/**
 * Get an invitation by token with workspace and inviter details.
 */
export async function getInvitationByToken(token: string): Promise<{
  invitation: WorkspaceInvitation;
  workspaceName: string;
  workspaceSlug: string;
  inviterName: string;
} | null> {
  if (!UUID_REGEX.test(token)) return null;

  const invitation = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.token, token))
    .get();

  if (!invitation) return null;

  const [workspace, inviter] = await Promise.all([
    db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .get(),
    db
      .select()
      .from(users)
      .where(eq(users.id, invitation.invitedBy))
      .get(),
  ]);

  if (!workspace || !inviter) return null;

  const inviterName =
    inviter.firstName && inviter.lastName
      ? `${inviter.firstName} ${inviter.lastName}`
      : inviter.email;

  return {
    invitation,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    inviterName,
  };
}

/**
 * Validate a workspace invitation token.
 */
export async function validateWorkspaceInvitation(
  token: string
): Promise<{ valid: boolean; errorMessage?: string }> {
  if (!UUID_REGEX.test(token)) {
    return { valid: false, errorMessage: "Invalid invitation link." };
  }

  const invitation = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.token, token))
    .get();

  if (!invitation) {
    return { valid: false, errorMessage: "This invitation doesn't exist." };
  }

  if (invitation.status !== "pending") {
    return {
      valid: false,
      errorMessage:
        invitation.status === "accepted"
          ? "This invitation has already been accepted."
          : invitation.status === "revoked"
            ? "This invitation has been revoked."
            : "This invitation has expired.",
    };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, errorMessage: "This invitation has expired." };
  }

  return { valid: true };
}

/**
 * Accept a workspace invitation.
 * Requires auth, verifies email match, activates waitlisted users,
 * adds to workspace, and redirects.
 */
export async function acceptWorkspaceInvitation(token: string): Promise<void> {
  const user = await requireAuth();

  const result = await getInvitationByToken(token);
  if (!result) {
    throw new Error("Invitation not found.");
  }

  const { invitation, workspaceSlug } = result;

  // Verify email matches
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error(
      `This invitation was sent to ${invitation.email}. You're signed in as ${user.email}.`
    );
  }

  // Validate invitation is still valid
  const { valid, errorMessage } = await validateWorkspaceInvitation(token);
  if (!valid) {
    throw new Error(errorMessage ?? "Invalid invitation.");
  }

  // Activate waitlisted user
  if (user.status !== "active") {
    await db
      .update(users)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // Check if already a member
  const existingMember = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, invitation.workspaceId),
        eq(workspaceMembers.userId, user.id)
      )
    )
    .get();

  if (!existingMember) {
    // Add to workspace
    await db.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId: user.id,
      role: invitation.role,
      createdAt: new Date(),
    });
  }

  // Mark invitation as accepted
  await db
    .update(workspaceInvitations)
    .set({ status: "accepted", claimedAt: new Date() })
    .where(eq(workspaceInvitations.id, invitation.id));

  redirect(`/w/${workspaceSlug}`);
}

/**
 * Get pending invitations for a workspace (admin only).
 */
export async function getWorkspacePendingInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  await requireWorkspaceAccess(workspaceId, "admin");

  return db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.status, "pending")
      )
    );
}

/**
 * Revoke a pending workspace invitation (admin only).
 */
export async function revokeWorkspaceInvitation(
  workspaceId: string,
  invitationId: string
): Promise<void> {
  await requireWorkspaceAccess(workspaceId, "admin");

  await db
    .update(workspaceInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(workspaceInvitations.id, invitationId),
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.status, "pending")
      )
    );

  revalidatePath(`/w/${workspaceId}/settings/members`);
}
