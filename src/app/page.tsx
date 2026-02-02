import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Home page - redirects authenticated users to the projects listing.
 */
export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/projects");
}
