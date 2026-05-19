// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export function proxy(request: NextRequest) {
  // Server-side heuristic: check for session cookie to infer authenticated users.
  // We look for `sessionid` (Django-style) or `userToken` (legacy) as indicators.
  const sessionCookie = request.cookies.get("sessionid")?.value || request.cookies.get("sessionId")?.value;
  const userToken = request.cookies.get("userToken")?.value || request.cookies.get("accessToken")?.value || request.cookies.get("access_token")?.value;
  
  // NextAuth session tokens (for OAuth/Google login)
  const nextAuthToken = request.cookies.get('next-auth.session-token')?.value || 
                        request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isAuthPresent = Boolean(sessionCookie || userToken);

  const { pathname } = request.nextUrl;

  // Only redirect onboarding routes when a real authenticated token is present.
  // `sessionid` represents an anonymous session and should NOT prevent users
  // from accessing the onboarding flow. Use `userToken` (set after login) as
  // the reliable indicator of an authenticated user.
  const isAuthTokenPresent = Boolean(userToken || nextAuthToken);

  // 🛡️ SECURITY: Protect authenticated routes (profile, checkout)
  if (!isAuthTokenPresent && (pathname.startsWith('/home/profile') || pathname.startsWith('/checkout'))) {
    const loginUrl = new URL('/onboarding', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthTokenPresent && (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Default: allow the request to continue. Additional protections (e.g. dashboard) can be
  // applied via separate matcher configs below.
  return NextResponse.next();
}

// Apply middleware to onboarding pages, protected routes, and dashboard paths
export const config = {
  matcher: [
    "/onboarding/:path*", 
    "/dashboard/:path*", 
    "/(onboarding)", 
    "/(onboarding)/:path*",
    "/home/profile/:path*",
    "/checkout/:path*"
  ],
};
