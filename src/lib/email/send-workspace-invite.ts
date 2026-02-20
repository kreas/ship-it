import { resend } from "./client";
import { WorkspaceInviteEmail } from "./templates/workspace-invite";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

interface SendWorkspaceInviteParams {
  to: string;
  token: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}

export async function sendWorkspaceInviteEmail({
  to,
  token,
  workspaceName,
  inviterName,
  role,
}: SendWorkspaceInviteParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("Resend not configured — skipping email to", to);
    return { success: false, error: "Email service not configured" };
  }

  const inviteUrl = `${APP_URL}/invite/${token}`;

  const { error } = await resend.emails.send({
    from: "Round 1 <invites@startround1.com>",
    to,
    subject: `You've been invited to join ${workspaceName}`,
    react: WorkspaceInviteEmail({
      workspaceName,
      inviterName,
      role,
      inviteUrl,
    }),
  });

  if (error) {
    console.error("Failed to send workspace invite email:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
