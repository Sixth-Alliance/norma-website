import { NextRequest, NextResponse } from 'next/server';

// Fall back to localhost API during development if env var isn't set.
// This keeps the proxy working out-of-the-box for local dev.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BASE_URL}/outlets/outlets/public/${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = '<could not read body>';
      }
      console.error('❌ Proxy error:', response.status, response.statusText, 'body:', bodyText);
      return NextResponse.json(
        { error: `Upstream error fetching ${url}: status ${response.status}`, details: bodyText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}