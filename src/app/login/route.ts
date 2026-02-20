import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const returnTo = request.nextUrl.searchParams.get("returnTo");

  // Persist returnTo as httpOnly cookie if it's a valid claim/invite path
  if (returnTo?.startsWith("/beta/") || returnTo?.startsWith("/invite/")) {
    const cookieStore = await cookies();
    cookieStore.set("returnTo", returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
  }

  const signInUrl = await getSignInUrl();
  return NextResponse.redirect(signInUrl);
};
