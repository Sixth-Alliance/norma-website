import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${backendUrl}/users/verify-otp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Forward Set-Cookie headers from backend to the client when present.
    // This ensures cookies the backend sets (e.g., httpOnly refresh tokens)
    // are passed through the proxy and persisted by the browser.
    const nextRes = NextResponse.json(data, { status: response.status });
    try {
      const setCookie = response.headers.get('set-cookie') || response.headers.get('Set-Cookie');
      if (setCookie) {
        // Set-Cookie is a hop-by-hop header; forwarding it allows browser to store cookies
        nextRes.headers.set('Set-Cookie', setCookie);
      }
    } catch (e) {
      // Best-effort: if header forwarding fails, continue returning the response body
      console.warn('Failed to forward Set-Cookie header from backend proxy', e);
    }

    return nextRes;
  } catch (error) {
    console.error('OTP verification proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Unable to verify OTP. Please check your connection and try again.',
        error: 'Network error' 
      },
      { status: 500 }
    );
  }
}
