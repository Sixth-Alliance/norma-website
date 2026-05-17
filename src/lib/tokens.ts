// Centralized token & cookie helpers
// Use this module as the single source of truth for cookie and token handling
// across the frontend. Keep access tokens in-memory when possible. Cart tokens
// (non-sensitive) are persisted to cookie/localStorage for compatibility.

const CART_TOKEN_KEY = 'cart_token';
const ACCESS_TOKEN_NAMES = ['userToken', 'accessToken', 'access_token'];

function safeIsBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getCookie(name: string): string | null {
  if (!safeIsBrowser()) return null;

  try {
    const value = `; ${document.cookie}`;
    if (process.env.NODE_ENV === 'development') {
      // console.log(`🔍 getCookie('${name}'):`, {
      //   fullCookieString: document.cookie,
      //   searchingFor: name,
      //   valueString: value.substring(0, 200) + '...',
      // });
    }
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const lastPart = parts.pop();
      if (lastPart) {
        const decoded = decodeURIComponent(lastPart.split(';').shift() || '');
        if (process.env.NODE_ENV === 'development') {
          // console.log(`✅ Found ${name}:`, decoded.substring(0, 50) + '...');
        }
        return decoded;
      }
    }
    if (process.env.NODE_ENV === 'development') {
      // console.log(`❌ Cookie '${name}' not found in:`, document.cookie);
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error reading cookie '${name}':`, e);
    }
  }
  return null;
}

export function getAuthToken(): string | null {
  // 🔥 PRIORITY 1: Check localStorage first (works even if cookies are httpOnly)
  if (typeof window !== 'undefined') {
    const localToken = window.localStorage.getItem('userToken') || 
                      window.localStorage.getItem('accessToken') || 
                      window.localStorage.getItem('access_token') || 
                      null;
    if (localToken) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        // console.log('✅ getAuthToken: Found token in localStorage');
      }
      return localToken;
    }
  }

  // 🔥 PRIORITY 2: Try cookies (but may fail if httpOnly)
  const cookieToken = getCookie('userToken') || getCookie('debug_userToken') || getCookie('accessToken') || getCookie('access_token');
  if (cookieToken) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      // console.log('✅ getAuthToken: Found token in cookies');
    }
    return cookieToken;
  }
  
  // Log when no token found (helps debug auth failures)
  // if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  //   console.warn('❌ getAuthToken: No auth token found in localStorage or cookies');
  //   console.warn('Available cookies (document.cookie):', document?.cookie);
  //   console.warn('LocalStorage userToken:', window?.localStorage?.getItem('userToken') ? 'EXISTS' : 'MISSING');
  // }
  
  return null;
}

export function getCartToken(): string | null {
  if (!safeIsBrowser()) return null;
  const fromCookie = getCookie(CART_TOKEN_KEY);
  if (fromCookie) return fromCookie;
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setCartToken(token: string | null): void {
  if (!safeIsBrowser()) return;
  try {
    // Set cookie as a fallback; server usually sets httpOnly cookie.
    if (typeof document !== 'undefined') {
      if (token) {
        const maxAge = 14 * 24 * 60 * 60; // 14 days
        const isSecure = window.location && window.location.protocol === 'https:';
        const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = `${CART_TOKEN_KEY}=${encodeURIComponent(token)}; ${cookieOptions}`;
      }
    }
    if (token) window.localStorage.setItem(CART_TOKEN_KEY, token);
    else window.localStorage.removeItem(CART_TOKEN_KEY);
  } catch (e) {
    // best-effort
  }
}

export function attachCartTokenHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCartToken();
  if (token) return { ...headers, 'X-Cart-Token': token };
  return headers;
}

// TokenManager mirrors the API used by src/api/client.ts (static methods)
export class TokenManager {
  private static inMemoryAccessToken: string | null = null;
  private static readonly CART_TOKEN_KEY = CART_TOKEN_KEY;

  static getAccessToken(): string | null {
    if (!safeIsBrowser()) return null;
    // Prefer cookie first - include debug_userToken for Google OAuth debugging
    const fromCookie = this.getCookie('accessToken') || this.getCookie('userToken') || this.getCookie('debug_userToken') || this.getCookie('access_token');
    if (fromCookie) return fromCookie;
    return this.inMemoryAccessToken;
  }

  static setAccessToken(token: string | null): void {
    this.inMemoryAccessToken = token || null;
  }

  static getCartToken(): string | null {
    if (!safeIsBrowser()) return null;
    const fromCookie = this.getCookie(this.CART_TOKEN_KEY);
    if (fromCookie) return fromCookie;
    try { return window.localStorage.getItem(this.CART_TOKEN_KEY); } catch { return null; }
  }

  static setCartToken(token: string | null): void {
    if (!safeIsBrowser()) return;
    try {
      if (token) window.localStorage.setItem(this.CART_TOKEN_KEY, token);
      else window.localStorage.removeItem(this.CART_TOKEN_KEY);
      if (typeof document !== 'undefined' && token) {
        const maxAge = 14 * 24 * 60 * 60;
        const isSecure = window.location && window.location.protocol === 'https:';
        const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = `${this.CART_TOKEN_KEY}=${encodeURIComponent(token)}; ${cookieOptions}`;
      }
    } catch (e) {
      /* swallow */
    }
  }

  static rotateCartToken(newToken: string): void {
    this.setCartToken(newToken);
  }

  private static getCookie(name: string): string | null {
    return getCookie(name);
  }
}

export default {
  getCookie,
  getAuthToken,
  getCartToken,
  setCartToken,
  attachCartTokenHeader,
  TokenManager,
}

// Clear all known auth-related cookies and client-side storage.
// This is a centralized cleanup function used during logout and error
// recovery flows to avoid duplicated cookie-deletion logic across the app.
export function clearAuthCookies(): void {
  if (!safeIsBrowser()) return;
  try {
    // Remove known access token cookie names (only use camelCase versions to avoid duplicates)
    const authNames = [...ACCESS_TOKEN_NAMES, 'refreshToken', 'debug_userToken'];
    for (const name of authNames) {
      // Expire the cookie
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    // Remove from localStorage where applicable
    try {
      for (const name of [...ACCESS_TOKEN_NAMES, 'refreshToken', 'debug_userToken', CART_TOKEN_KEY]) {
        window.localStorage.removeItem(name);
      }
    } catch (e) {
      // ignore
    }

    // Clear in-memory tokens
    try {
      TokenManager.setAccessToken(null as any);
      TokenManager.setCartToken(null);
    } catch (e) {
      // swallow
    }
  } catch (e) {
    // best-effort cleanup
  }
}

// Set auth cookies (access + optional refresh) and update in-memory token.
// This centralizes cookie options and avoids ad-hoc cookie writes across the app.
export function setAuthCookies(accessToken?: string | null, refreshToken?: string | null, opts?: { accessMaxAge?: number; refreshMaxAge?: number; secure?: boolean } ) {
  if (!safeIsBrowser()) return;
  try {
    const accessMaxAge = opts?.accessMaxAge ?? (60 * 60 * 24 * 5); // 5 days
    const refreshMaxAge = opts?.refreshMaxAge ?? (60 * 60 * 24 * 30); // 30 days
    const isSecure = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && (opts?.secure ?? true);
    const sameSite = 'samesite=lax';

    if (process.env.NODE_ENV !== 'production') {
      // console.log('🍪 setAuthCookies called with:', {
      //   accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'null',
      //   refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null',
      //   isSecure,
      //   protocol: window?.location?.protocol,
      // });
    }

    if (accessToken) {
      try {
        const cookieString1 = `userToken=${encodeURIComponent(accessToken)}; path=/; max-age=${accessMaxAge}; ${sameSite}${isSecure ? '; Secure' : ''}`;
        const cookieString2 = `accessToken=${encodeURIComponent(accessToken)}; path=/; max-age=${accessMaxAge}; ${sameSite}${isSecure ? '; Secure' : ''}`;
        document.cookie = cookieString1;
        document.cookie = cookieString2;
        
        // 🔥 BACKUP: Also store in localStorage for cross-domain compatibility
        try {
          window.localStorage.setItem('userToken', accessToken);
          window.localStorage.setItem('accessToken', accessToken);
        } catch (e) {
          // Ignore localStorage errors
        }
        
        if (process.env.NODE_ENV !== 'production') {
          // console.log('✅ Set cookies:', {
          //   userToken: cookieString1.substring(0, 100) + '...',
          //   accessToken: cookieString2.substring(0, 100) + '...',
          // });
          // Verify cookies were actually set
          // setTimeout(() => {
          //   console.log('🔍 Verification - Cookies after setting:', document.cookie);
          //   console.log('🔍 Verification - localStorage userToken:', window.localStorage.getItem('userToken') ? 'SET ✅' : 'MISSING ❌');
          // }, 50);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Error setting access cookies:', e);
        }
      }
      try { TokenManager.setAccessToken(accessToken as any); } catch (e) { /* swallow */ }
    }

    if (refreshToken) {
      try {
        // Only set refreshToken (camelCase) to avoid duplicates
        document.cookie = `refreshToken=${encodeURIComponent(refreshToken)}; path=/; max-age=${refreshMaxAge}; ${sameSite}${isSecure ? '; Secure' : ''}`;
        
        // 🔥 BACKUP: Also store in localStorage
        try {
          window.localStorage.setItem('refreshToken', refreshToken);
        } catch (e) {
          // Ignore
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error in setAuthCookies:', e);
    }
  }
}