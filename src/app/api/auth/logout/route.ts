import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear all auth cookies by setting them to expire
  const cookieNames = [
    'userToken',
    'accessToken', 
    'access_token',
    'refreshToken',
    'refresh_token',
    'debug_userToken'
  ];
  
  cookieNames.forEach(name => {
    // Clear httpOnly cookies
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    // Also clear non-httpOnly version
    response.cookies.set(name, '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  });
  
  return response;
}
