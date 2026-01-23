import { handleAuth } from "@workos-inc/authkit-nextjs";
import { syncUserFromWorkOS } from "@/lib/actions/users";

export const GET = handleAuth({
  async onSuccess({ user }) {
    // Sync user to database after successful authentication
    if (user) {
      await syncUserFromWorkOS({
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        avatarUrl: user.profilePictureUrl ?? null,
      });
    }
  },
});
