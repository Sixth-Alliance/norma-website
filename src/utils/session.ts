// utils/session.ts
import { getSessionInfo } from "@/src/app/api/action";
import { getCartToken, setCartToken } from "@/src/lib/tokens";
import { logger } from "@/src/utils/logger";

export interface SessionInfo {
  session_id: string;
  is_authenticated: boolean;
  user_id: string | null;
  user_email: string | null;
  session_data: Record<string, any>;
  instructions: {
    anonymous_cart: string;
    cookie_name: string;
    browser_storage: string;
  };
}

export class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionInfo | null = null;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Get or create session from backend
  async getOrCreateSession(outletId: string): Promise<SessionInfo> {
    try {
      // First, check if we already have a valid session ID in cookies
      // Token-first: prefer cart_token stored by backend or persisted locally
      const existingToken = getCartToken();
      if (existingToken && this.currentSession?.session_id === existingToken) {
        logger.debug("Using existing cart token (present)");
        return this.currentSession as SessionInfo;
      }

      const sessionInfo = await getSessionInfo(outletId);
      // Backend's sessionInfo.session_id now contains the cart_token
      this.currentSession = sessionInfo;

      // Persist cart_token using centralized helper
      try {
        if (sessionInfo && sessionInfo.session_id) {
          setCartToken(sessionInfo.session_id);
        }
      } catch (e) {
        logger.warn('Unable to persist cart_token in SessionManager', e);
      }

  // logger.info("Cart token initialized (stored)");
  // logger.info("Session is_authenticated: " + Boolean(sessionInfo.is_authenticated));
      return sessionInfo;
    } catch (error) {
      logger.error("Failed to get session:", error);
      throw error;
    }
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  getSessionId(): string | null {
    // Return cart_token (stored as session_id in normalized SessionInfo)
    if (this.currentSession) return this.currentSession.session_id;
    try {
      return getCartToken();
    } catch (e) {
      return null;
    }
  }

  private setSessionCookie(sessionId: string) {
    // Deprecated: sessions replaced by cart_token. Use setCartToken instead.
    try {
      setCartToken(sessionId);
    } catch (e) {
      logger.warn('Unable to set cart token cookie via setSessionCookie', e);
    }
  }

  clearSession() {
    this.currentSession = null;
    if (typeof document !== "undefined") {
      // Clear cart_token cookie and local persistence
      try { setCartToken(null); } catch (e) { logger.warn('Failed to clear cart token', e); }
      try { window.localStorage.removeItem('cart_token'); } catch(e){}
    }
  }
}
