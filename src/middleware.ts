import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("sessionid")?.value ||
    request.cookies.get("sessionId")?.value;
  const userToken =
    request.cookies.get("userToken")?.value ||
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("access_token")?.value;

  // NextAuth session tokens (for OAuth/Google login)
  const nextAuthToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const { pathname } = request.nextUrl;

  // `userToken` (set after OTP login) or nextAuthToken indicate a real authenticated user.
  const isAuthTokenPresent = Boolean(userToken || nextAuthToken);

  // 🛡️ SECURITY: Protect authenticated routes (profile, checkout)
  if (
    !isAuthTokenPresent &&
    (pathname.startsWith("/home/profile") ||
      pathname.startsWith("/checkout"))
  ) {
    const loginUrl = new URL("/onboarding", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isAuthTokenPresent &&
    (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))
  ) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/(onboarding)",
    "/(onboarding)/:path*",
    "/home/profile/:path*",
    "/checkout/:path*",
  ],
};
