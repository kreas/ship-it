interface WorkspaceInviteEmailProps {
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export function WorkspaceInviteEmail({
  workspaceName,
  inviterName,
  role,
  inviteUrl,
}: WorkspaceInviteEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "560px",
        margin: "0 auto",
        padding: "40px 20px",
        color: "#1a1a1a",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          margin: "0 0 16px",
          lineHeight: 1.3,
        }}
      >
        You&apos;ve been invited to join {workspaceName}
      </h1>

      <p
        style={{
          fontSize: "16px",
          lineHeight: 1.5,
          margin: "0 0 24px",
          color: "#4a4a4a",
        }}
      >
        {inviterName} has invited you to join{" "}
        <strong>{workspaceName}</strong> as a {role} on Round 1.
      </p>

      <a
        href={inviteUrl}
        style={{
          display: "inline-block",
          padding: "12px 32px",
          backgroundColor: "#171717",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
          borderRadius: "8px",
        }}
      >
        Accept Invitation
      </a>

      <p
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          margin: "24px 0 0",
          color: "#999",
        }}
      >
        This invitation expires in 7 days. If you didn&apos;t expect this
        email, you can safely ignore it.
      </p>
    </div>
  );
}
