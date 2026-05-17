import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getUserProfile, logoutUser, User } from "@/src/app/api/action";
import { initializeAnonymousSession } from "@/src/app/api/action";
import { SessionManager } from "@/src/utils/session";
import { logger } from "@/src/utils/logger";
import { useOutletStore } from "@/src/store/OutletStore";
import { useCartStore } from "@/src/store/CartStore";
import {
  extractAndThrowLoginError,
  extractAndThrowVerifyOTPError,
} from "@/src/utils/throwErrorFunctions";
import { setAuthCookies, clearAuthCookies } from '@/src/lib/tokens';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://norma-api.up.railway.app/api/v1';

interface AuthState {
  user: User;
  emailForOTP: string;
  isAuthenticated: boolean;
  // Indicates that persisted auth has been rehydrated and validated.
  isRehydrated: boolean;
  signinUser: (data: any) => Promise<any>;
  verifyOTP: (data: any) => Promise<any>;
  setEmailForOTPstate: (data: any) => void;
  clearEmailForOTP: () => void;
  storeUserData: (data: any) => void;
  fetchUserProfile: () => Promise<User>;
  logout: () => Promise<boolean>;
  getDisplayName: () => string;
  isUserAuthenticated: () => boolean;
  // Setter to mark rehydration complete from outside (AuthInit)
  setRehydrated: (val: boolean) => void;
}

const initialState = {
  user: {} as User,
  emailForOTP: "",
  isAuthenticated: false,
  isRehydrated: false,
};

// Helper function to extract name from email
const getNameFromEmail = (email: string): string => {
  if (!email) return "";
  const localPart = email.split("@")[0];
  return localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Sign in user (request OTP)
      signinUser: async (data: any) => {
        try {
          const res = await fetch(
            `${BASE_URL}/users/request-otp/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(data),
            }
          );

          const responseData = await res.json();

          if (!res.ok) {
            extractAndThrowLoginError(responseData);
          }

          return responseData;
        } catch (error: any) {
          logger.error("Error fetching external data:", error.message);
          return error.message;
        }
      },
      
      // Verify OTP
      verifyOTP: async (data: any) => {
        try {
          const response = await fetch(
            `/api/proxy/users/verify-otp`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(data),
            }
          );
          const responseData = await response.json();

          // Only log in development, not production
          if (process.env.NODE_ENV !== 'production') {
            logger.debug("OTP verification response:", { status: response.status, data: responseData });
          }

          if (!response.ok) {
            if (process.env.NODE_ENV !== 'production') {
              logger.warn("OTP verification failed:", responseData);
            }
            extractAndThrowVerifyOTPError(responseData);
          }

          // Store user data and set authentication
          set(() => ({
            user: responseData.data.user,
            isAuthenticated: true,
            emailForOTP: "",
            isRehydrated: true, // ✅ Mark as rehydrated since we just logged in
          }));

          // Set token in cookie. API may return different field names (access, access_token, accessToken)
          const accessToken =
            responseData?.data?.access_token ||
            responseData?.data?.access ||
            responseData?.data?.accessToken ||
            responseData?.data?.accessToken;
          const refreshToken =
            responseData?.data?.refresh_token ||
            responseData?.data?.refresh ||
            responseData?.data?.refreshToken || null;

          if (process.env.NODE_ENV !== 'production') {
            logger.debug("🔑 Auth tokens from OTP response:", {
              accessToken: accessToken ? "✅ Found" : "❌ Missing",
              refreshToken: refreshToken ? "✅ Found" : "❌ Missing",
              responseDataKeys: Object.keys(responseData?.data || {}),
            });
          }

          if (accessToken) {
            // Centralized cookie setter (keeps in-memory TokenManager in sync).
            try {
              setAuthCookies(accessToken, refreshToken);
              if (process.env.NODE_ENV !== 'production') {
                logger.debug("✅ setAuthCookies called, checking cookies...");
                // Check if cookies were actually set
                setTimeout(() => {
                  logger.debug("📋 Current cookies after setAuthCookies:", document.cookie);
                }, 100);
              }
            } catch (e) {
              logger.warn('❌ Unable to set auth cookies via helper', e);
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              logger.error("❌ No access token found in OTP response! Response structure:", responseData);
            }
          }
          if (refreshToken) {
            // refresh token already set by setAuthCookies above
          }
          // After login, attempt to merge any anonymous cart into the user's cart
          try {
            // Clear old cart IDs first - anonymous cart will be merged server-side
            const { clearCartIdsAfterLogin } = useCartStore.getState();
            clearCartIdsAfterLogin();

            // Determine selected outlet first - merge requires outlet_id
            const selectedOutlet = useOutletStore.getState().selectedOutlet;
            const outletId = selectedOutlet?.id || '';

            if (!outletId) {
              logger.warn('No outlet selected; skipping server-side cart merge after login');
            } else {
              const { mergeAnonymousCartIntoUser } = await import('@/src/app/api/action');
              const mergeResult = await mergeAnonymousCartIntoUser(outletId);
              // logger.info('🔗 Cart merge result after login:', mergeResult);

              // Trigger cart re-sync for selected outlet
              const { reSyncCartWithBackend } = useCartStore.getState();
              if (mergeResult && mergeResult.items && mergeResult.items.length > 0) {
                // Server merge succeeded and returned items - sync them (silent to avoid duplicate login toasts)
                await reSyncCartWithBackend(outletId, { silent: true });
              } else {
                // Server merge returned empty or didn't run - fallback: push local items to user cart
                logger.warn('Server merge returned empty; performing client-side fallback merge');
                // Legacy mergeLocalItemsToUserCart removed
              }
            }
          } catch (e) {
            logger.warn('Cart merge after login failed; performing client-side fallback merge', e);
            try {
              const selectedOutlet = useOutletStore.getState().selectedOutlet;
              const outletId = selectedOutlet?.id || '';
              if (outletId) {
                // Legacy mergeLocalItemsToUserCart removed from store
                // Legacy mergeLocalItemsToUserCart removed
              }
            } catch (err) {
              logger.error('Fallback merge also failed', err);
            }
          }
          
          return responseData;
        } catch (error: any) {
          // Only log errors in development
          if (process.env.NODE_ENV !== 'production') {
            logger.error("Error verifying OTP:", error.message || error);
          }
          
          // Return consistent error format with better messages
          const errorMessage = error.message || "Verification failed. Please try again.";
          
          return {
            success: false,
            message: errorMessage
          };
        }
      },
      
      setEmailForOTPstate: (data: any) => {
        set(() => ({ emailForOTP: data }));
      },
      
      clearEmailForOTP: () => {
        set(() => ({ emailForOTP: "" }));
      },
      
      storeUserData: (data: any) => {
        set(() => ({
          user: data.user || data,
          isAuthenticated: true,
        }));
        set(() => ({ emailForOTP: "" }));
      },
      setRehydrated: (val: boolean) => {
        set(() => ({ isRehydrated: val }));
      },
      
      // Fetch user profile from API
      fetchUserProfile: async () => {
        try {
          const profileData = await getUserProfile();
          set(() => ({
            user: profileData,
            isAuthenticated: true,
            // When profile is fetched successfully we consider rehydration/validation done
            isRehydrated: true,
          }));
          return profileData;
        } catch (error: any) {
          // Only log errors in development, not production
          if (process.env.NODE_ENV !== 'production') {
            // 401 errors are expected for anonymous/unauthenticated users - log as debug
            if (error.message && error.message.includes("401")) {
              logger.debug("Failed to fetch user profile: No active session (expected for anonymous users)");
            } else {
              logger.error("Failed to fetch user profile:", error.message);
            }
          }
          
          // If we get 401 or auth error, clear stale auth state
          // This handles the case where Zustand persisted auth but cookies expired
          if (error.message && (error.message.includes("401") || error.message.includes("authentication") || error.message.includes("No authentication token"))) {
            logger.info("Clearing stale authentication state (cookies expired)");
            set(() => ({
              user: {} as User,
              isAuthenticated: false,
              isRehydrated: true,
            }));
            // Clear any stale cookies
            try {
              clearAuthCookies();
            } catch (e) {
              logger.warn("Failed to clear auth cookies during profile fetch error", e);
            }
          }
          
          throw error;
        }
      },
      
      // Logout function
      logout: async () => {
        try {
          await logoutUser();
          
          // Clear local state
          set(() => ({
            user: {} as User,
            isAuthenticated: false,
            emailForOTP: "",
          }));
          
          // Clear local auth and session state but KEEP cart persistence so
          // users don't lose their per-outlet carts when they log out.
          if (typeof window !== "undefined") {
            localStorage.removeItem("userauth-storage");
            localStorage.removeItem("auth-storage");
            localStorage.removeItem("delivery-address");
            localStorage.removeItem("user-phone");

            // Centralized auth cleanup (cookies + localStorage + in-memory)
            try {
              clearAuthCookies();
            } catch (e) {
              logger.warn('clearAuthCookies failed during logout', e);
            }

            // IMPORTANT: DO NOT clear the backend cart - it should persist with the user's account
            // Only clear local frontend state so the next user doesn't see this cart
            try {
              // Reset local in-memory cart state using zustand setter
              const { setState } = useCartStore as any;
              try {
                setState({
                  items: [],
                  backendCartId: null,
                  currentOutletId: null,
                  wasIntentionallyCleared: true,
                });
              } catch (e) {
                logger.warn('Unable to reset cart store state during logout', e);
              }

              // Remove any per-outlet persisted carts from localStorage
              try {
                for (const key of Object.keys(localStorage)) {
                  if (key.startsWith('cart_')) {
                    localStorage.removeItem(key);
                  }
                }
              } catch (e) {
                logger.warn('Unable to enumerate localStorage keys for cart cleanup', e);
              }
            } catch (e) {
              logger.warn('Unable to clear cart store on logout', e);
            }

            // 🔥 Redirect to onboarding with force_logout to clear httpOnly cookies
            if (typeof window !== 'undefined') {
              // Redirect will happen, but return true to satisfy TypeScript
              setTimeout(() => {
                window.location.href = '/onboarding?force_logout=1';
              }, 100);
              return true;
            }

            // Clear internal session manager state and create a fresh anonymous session
            try {
              const sessionManager = SessionManager.getInstance();
              sessionManager.clearSession();

              const selectedOutlet = useOutletStore.getState().selectedOutlet;
              const outletId = selectedOutlet?.id || "";

              // Create a new anonymous session and persist session id to sessionStorage
              initializeAnonymousSession(outletId)
                .then((sessionInfo) => {
                  // logger.info("🔐 New anonymous session created after logout:", sessionInfo.session_id);
                  try {
                    // Persist cart_token
                    window.localStorage.setItem('cart_token', sessionInfo.session_id);
                  } catch (e) {
                    logger.warn('Unable to write cart_token to localStorage', e);
                  }

                  // Re-initialize cart for the selected outlet so frontend uses the new session
                  if (outletId) {
                    const { initializeCartForOutlet } = useCartStore.getState();
                    initializeCartForOutlet(outletId).catch(err => logger.error('Failed to init cart after logout', err));
                  }
                })
                .catch((err) => logger.error('Failed to create anonymous session after logout', err));
            } catch (err) {
              logger.error('Error while resetting session after logout:', err);
            }
          }
          
          return true;
        } catch (error: any) {
          logger.error("Logout failed:", error.message);
          // Still clear local state even if API call fails
          set(() => ({
            user: {} as User,
            isAuthenticated: false,
            emailForOTP: "",
          }));
          
          if (typeof window !== "undefined") {
            localStorage.removeItem("userauth-storage");
            localStorage.removeItem("auth-storage");
            localStorage.removeItem("delivery-address");
            localStorage.removeItem("user-phone");

            // Even on error, reset session and create an anonymous session to preserve cart UX
            try {
              const sessionManager = SessionManager.getInstance();
              sessionManager.clearSession();

              const selectedOutlet = useOutletStore.getState().selectedOutlet;
              const outletId = selectedOutlet?.id || "";

              initializeAnonymousSession(outletId)
                .then((sessionInfo) => {
                  // logger.info("🔐 New anonymous session created after logout (error path):", sessionInfo.session_id);
                  try {
                    window.localStorage.setItem('cart_token', sessionInfo.session_id);
                  } catch (e) {
                    logger.warn('Unable to write cart_token to localStorage', e);
                  }
                  if (outletId) {
                    const { initializeCartForOutlet } = useCartStore.getState();
                    initializeCartForOutlet(outletId).catch(err => logger.error('Failed to init cart after logout', err));
                  }
                })
                .catch((err) => logger.error('Failed to create anonymous session after logout (error path)', err));
            } catch (err) {
              logger.error('Error while resetting session after logout (error path):', err);
            }
          }
          
          throw error;
        }
      },
      
      // Get display name (with fallback to email)
      getDisplayName: () => {
        const state = get();
        const user = state.user;
        
        if (user.first_name && user.last_name) {
          return `${user.first_name} ${user.last_name}`;
        } else if (user.first_name) {
          return user.first_name;
        } else if (user.email) {
          return getNameFromEmail(user.email);
        }
        
        return "User";
      },
      
      // Check if user is authenticated
      isUserAuthenticated: () => {
        const state = get();
        
        // PRIMARY CHECK: Check if we have a valid auth token in cookies
        // This ensures authentication works immediately on page reload
        // without waiting for rehydration/profile fetch
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          const getCookie = (name: string): string | null => {
            try {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) {
                const lastPart = parts.pop();
                if (lastPart) return decodeURIComponent(lastPart.split(';').shift() || '');
              }
            } catch (e) {
              /* ignore */
            }
            return null;
          };
          
          const cookieToken = getCookie('userToken') || getCookie('accessToken') || getCookie('access_token');
          if (cookieToken) {
            // User has valid auth cookie - consider them authenticated
            return true;
          }
        }
        
        // FALLBACK CHECK: Use Zustand state (for SSR or when cookies aren't accessible)
        // Only treat the user as authenticated once rehydration/validation has completed.
        return state.isAuthenticated && !!state.user.id && !!state.isRehydrated;
      },
    }),
    {
      name: 'auth-storage',
      // Persist emailForOTP so verification flow survives refresh
      partialize: (state) => ({ emailForOTP: state.emailForOTP }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset auth state (cookies are source of truth) but KEEP emailForOTP
          state.isAuthenticated = false;
          state.user = {} as User;
          state.isRehydrated = false;
          // emailForOTP is preserved from storage
        }
      },
    },
  ),
)
