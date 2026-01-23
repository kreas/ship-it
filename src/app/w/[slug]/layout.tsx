import { redirect, notFound } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getWorkspaceBySlug, requireWorkspaceAccess } from "@/lib/actions/workspace";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  // Check authentication
  const { user } = await withAuth();
  if (!user) {
    redirect("/auth/callback");
  }

  // Get workspace by slug
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  // Verify user has access to this workspace
  try {
    await requireWorkspaceAccess(workspace.id);
  } catch {
    // User doesn't have access - redirect to home
    redirect("/");
  }

  return <>{children}</>;
}
