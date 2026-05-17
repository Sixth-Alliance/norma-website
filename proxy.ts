import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/home/profile',
  '/home/orders',
  '/home/tracking',
  '/home/notifications',
];

// Routes that should redirect to home if already authenticated
const authRoutes = ['/onboarding', '/verify', '/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 🔥 Allow onboarding access if ?force_logout=1 is present
  const forceLogout = request.nextUrl.searchParams.get('force_logout');
  if (forceLogout === '1' && pathname === '/onboarding') {
    // Clear httpOnly cookies and allow access
    const response = NextResponse.next();
    const cookieNames = ['userToken', 'accessToken', 'access_token', 'refreshToken', 'refresh_token'];
    cookieNames.forEach(name => {
      response.cookies.set(name, '', {
        httpOnly: true,
        maxAge: 0,
        path: '/',
      });
    });
    return response;
  }
  
  // Check for auth tokens in cookies (these are set by backend and client)
  const userToken = request.cookies.get('userToken')?.value || 
                    request.cookies.get('accessToken')?.value ||
                    request.cookies.get('access_token')?.value;
  
  const isAuthenticated = !!userToken;
  
  // Protect authenticated routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL('/onboarding', request.url);
    // Store the original URL for redirect after login
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  
  // Redirect authenticated users away from auth pages
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  if (isAuthRoute && isAuthenticated) {
    // If there's a redirect parameter, go there, otherwise go to home
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/home';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
