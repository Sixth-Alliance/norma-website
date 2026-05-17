import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  
  // Get base URL from environment variable (set in Railway/production) or use request origin as fallback
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  
  const redirectUri = `${baseUrl}/api/auth/callback/google`

  if (!clientId) {
    return NextResponse.json({ error: 'Google client ID not configured' }, { status: 500 })
  }

  const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    })

  return NextResponse.redirect(authUrl)
}