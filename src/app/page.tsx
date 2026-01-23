import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserDefaultWorkspace } from "@/lib/actions/workspace";

/**
 * Home page - redirects authenticated users to their default workspace.
 */
export default async function Home() {
  // Check authentication
  const { user } = await withAuth();

  if (!user) {
    // Will be redirected by middleware, but handle edge case
    redirect("/auth/callback");
  }

  // Get user's default workspace
  const defaultWorkspace = await getUserDefaultWorkspace();

  if (defaultWorkspace) {
    // Redirect to default workspace
    redirect(`/w/${defaultWorkspace.slug}`);
  } else {
    // No workspaces - redirect to create page
    redirect("/w/new");
  }
}
