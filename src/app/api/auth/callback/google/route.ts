import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Get base URL from environment variable (set in Railway/production) or use request origin as fallback
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL("/onboarding?error=google_auth_failed", baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/onboarding?error=no_code", baseUrl)
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/callback/google`;
    // console.log("OAuth redirect_uri used:", redirectUri); // DEBUG

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(
        new URL("/onboarding?error=token_exchange_failed", baseUrl)
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/onboarding?error=no_access_token", baseUrl)
      );
    }

    // Forward token to backend
    const cartToken = request.cookies.get("cart_token")?.value || null;
    const sessionId = request.cookies.get("session_id")?.value || null;

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/google-auth/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: accessToken,
          cart_token: cartToken,
          session_id: sessionId,
        }),
      }
    );

    const backendData = await backendResponse.json();

    if (!backendResponse.ok || !backendData.success) {
      console.error("Backend auth failed:", backendData);
      return NextResponse.redirect(
        new URL("/onboarding?error=backend_auth_failed", baseUrl)
      );
    }

    // Redirect to home after successful login
    const redirectResponse = NextResponse.redirect(
      new URL("/home", baseUrl)
    );

    const accessTokenValue =
      backendData.data.access || backendData.data.access_token || "";
    const refreshTokenValue =
      backendData.data.refresh || backendData.data.refresh_token || "";

    // Set cookies (NOT httpOnly so JavaScript can read for client-side auth)
    redirectResponse.cookies.set("userToken", accessTokenValue, {
      httpOnly: false, // ✅ Allow JavaScript to read for isUserAuthenticated() checks
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days
    });

    redirectResponse.cookies.set("accessToken", accessTokenValue, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days
    });

    redirectResponse.cookies.set("refreshToken", refreshTokenValue, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return redirectResponse;
  } catch (err) {
    console.error("Google auth callback error:", err);
    return NextResponse.redirect(
      new URL("/onboarding?error=auth_error", baseUrl)
    );
  }
}
