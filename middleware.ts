import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  // Redirect unauthenticated users to sign in
  redirectUri: "/auth/callback",
  // Require authentication for all routes
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/auth/callback"],
  },
});

export const config = {
  // Match all routes except static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
