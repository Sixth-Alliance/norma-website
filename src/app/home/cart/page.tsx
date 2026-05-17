"use client";
import CartCard from "@/src/components/home-components/cartComponent/CartCard";
import CustomButton from "@/src/components/home-components/CustomButton";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import Image5 from "@/src/assets/images/image_food.svg";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsCartCheck } from "react-icons/bs";
import Method from "@/src/components/home-components/cartComponent/Method";
import DeliveryModal from "@/src/components/home-components/cartComponent/DeliveryModal";
import DeliveryMobileModal from "@/src/components/home-components/cartComponent/DeliveryMobileModal";
import CheckOutDesktop from "@/src/components/home-components/cartComponent/CheckOutDesktop";
import CheckOutMobile from "@/src/components/home-components/cartComponent/CheckOutMobile";
import useCountStore from "@/src/store/CounterStore";
import { useCartStore } from "@/src/store/CartStore";
import type { CartItem } from "@/src/types/CartTypes";
import { useOutletStore } from "@/src/store/OutletStore";
import { useAuthStore } from "@/src/store/authStore";
import {
  getCurrentCart,
  calculateDeliveryFee,
  checkoutCart,
  getUserProfile,
  type DeliveryFeeRequest,
  type CheckoutRequest,
  getPaymentConfig,
  initializePayment,
  getPaymentStatus,
} from "@/src/app/api/action";
import { getAllOutlets } from "@/src/app/api/action";
import { startPaymentFlow, openPaystackPopup } from "@/src/lib/payment";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { formatCurrency } from "@/src/lib/utils";
// SessionManager replaced by token-first helpers; session utils still available if needed
import { logger, initGlobalLogger } from "@/src/utils/logger";
import { getCookie } from "@/src/lib/tokens";
import extractDeliveryErrorMessage from "@/src/utils/extractDeliveryErrorMessage";

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  ref: string;
  currency?: string;
  callback: (response: any) => void;
  onClose: () => void;
}
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void };
    };
  }
}
// Use centralized getCookie from src/lib/tokens

const debugCookies = () => {
  logger.debug("Cookies present (known keys):", {
    cart_token: !!getCookie("cart_token"),
    userToken: !!getCookie("userToken"),
  });
};
const Page = () => {
  const { selectedOutlet } = useOutletStore();
  const { isUserAuthenticated } = useAuthStore();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalQuantity,
    syncCartFromBackend,
    initializeCartForOutlet,
    reSyncCartWithBackend,
    backendCartId,
    addItem,
  } = useCartStore();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<
    string | null
  >(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryAvailability, setDeliveryAvailability] = useState<{
    isDeliverable: boolean;
    message?: string;
    estimatedTime?: string;
  }>({ isDeliverable: false, message: "", estimatedTime: "" });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | undefined>(
    undefined,
  );
  const [deliveryLongitude, setDeliveryLongitude] = useState<
    number | undefined
  >(undefined);
  const [deliveryDebounceTimer, setDeliveryDebounceTimer] = useState<
    number | null
  >(null);
  const [resolvingManualAddress, setResolvingManualAddress] = useState(false);
  const lastDeliveryErrorRef = useRef<string | null>(null); // Track last error to prevent duplicate toasts
  const router = useRouter();

  const roundCoordinate = (coord: number | undefined): string | null => {
    if (coord === null || coord === undefined) return null;
    return coord.toFixed(6);
  };

  const persistDeliveryCoordinates = (
    lat: number,
    lng: number,
    formatted?: string,
  ) => {
    setDeliveryLatitude(lat);
    setDeliveryLongitude(lng);
    if (formatted) {
      setDeliveryAddress(formatted);
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("deliveryLatitude", lat.toString());
        window.localStorage.setItem("deliveryLongitude", lng.toString());
      } catch (err) {
        logger.warn("Unable to persist manual coordinates to storage", err);
      }
      try {
        window.dispatchEvent(
          new CustomEvent("coordinatesUpdated", {
            detail: {
              latitude: lat,
              longitude: lng,
              formattedAddress: formatted || deliveryAddress,
            },
          }),
        );
      } catch (err) {
        // best-effort
      }
    }
  };

  const geocodeViaBrowser = (addressText: string) =>
    new Promise<{ lat: number; lng: number; formattedAddress?: string } | null>(
      (resolve) => {
        if (typeof window === "undefined" || !window.google?.maps?.Geocoder) {
          resolve(null);
          return;
        }
        try {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { address: addressText, componentRestrictions: { country: "ng" } },
            (
              results: google.maps.GeocoderResult[] | null,
              status: google.maps.GeocoderStatus,
            ) => {
              if (
                status === "OK" &&
                results &&
                results[0]?.geometry?.location
              ) {
                const loc = results[0].geometry.location;
                resolve({
                  lat: loc.lat(),
                  lng: loc.lng(),
                  formattedAddress: results[0].formatted_address,
                });
              } else {
                resolve(null);
              }
            },
          );
        } catch (err) {
          logger.warn("Browser geocoder failed", err);
          resolve(null);
        }
      },
    );

  const geocodeViaHttp = async (addressText: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressText,
        )}&key=${apiKey}`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: data.results[0].formatted_address,
        };
      }
    } catch (err) {
      logger.warn("HTTP geocode failed", err);
    }
    return null;
  };

  const attemptGeocodeForTypedAddress = async (
    addressText: string,
  ): Promise<boolean> => {
    const trimmed = String(addressText || "").trim();
    if (!trimmed) return false;
    try {
      const browserResult = await geocodeViaBrowser(trimmed);
      if (browserResult) {
        persistDeliveryCoordinates(
          browserResult.lat,
          browserResult.lng,
          browserResult.formattedAddress,
        );
        return true;
      }
      const httpResult = await geocodeViaHttp(trimmed);
      if (httpResult) {
        persistDeliveryCoordinates(
          httpResult.lat,
          httpResult.lng,
          httpResult.formattedAddress,
        );
        return true;
      }
    } catch (error) {
      logger.error("Manual address geocode failed", error);
    }
    return false;
  };

  const [loading, setLoading] = useState(true);

  // Paystack configuration (can be fetched from backend)
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>(
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      "pk_test_your_public_key_here",
  );

  useEffect(() => {
    // Initialize global logger (overrides console in production and enables remote forwarding)
    try {
      initGlobalLogger();
      logger.info("Logger initialized on cart page");
    } catch (e) {
      // ignore
    }
  }, []);

  // Debug cart items changes
  useEffect(() => {
    logger.debug("🛒 CART DEBUG - Current state:", {
      itemsCount: items.length,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
      })),
      backendCartId,
      selectedOutletId: selectedOutlet?.id,
      totalQuantity: getTotalQuantity(),
    });
  }, [items, backendCartId, selectedOutlet?.id]);

  useEffect(() => {
    // Skip if basic requirements not met
    if (!selectedOutlet?.id || selectedDeliveryMethod !== "delivery") return;

    // Critical: Skip if no backend cart exists (prevents errors after order completion)
    if (!backendCartId) {
      logger.debug(
        "🚚 Skipping delivery fee calculation - no backend cart ID available",
      );
      return;
    }

    // Only calculate if we have an address OR coordinates (at least one is required)
    if (
      !String(deliveryAddress || "").trim() &&
      (!deliveryLatitude || !deliveryLongitude)
    ) {
      logger.debug(
        "🚚 Skipping delivery fee calculation - no address or coordinates provided",
      );
      return;
    }

    // Skip if cart has no items (no point calculating delivery for empty cart)
    if (items.length === 0) {
      logger.debug("🚚 Skipping delivery fee calculation - cart is empty");
      return;
    }

    // Clear previous timer
    if (deliveryDebounceTimer) {
      clearTimeout(deliveryDebounceTimer);
      setDeliveryDebounceTimer(null);
    }

    const timer = window.setTimeout(async () => {
      try {
        setCalculatingFee(true);
        const deliveryFeeRequest: DeliveryFeeRequest = {
          cart_id: backendCartId,
          delivery_address_text: deliveryAddress || "",
          fulfillment_mode: "delivery",
          ...(deliveryLatitude &&
            deliveryLongitude && {
              delivery_latitude: roundCoordinate(deliveryLatitude),
              delivery_longitude: roundCoordinate(deliveryLongitude),
            }),
        };

        logger.info("🚚 DELIVERY FEE - Request details:", {
          ...deliveryFeeRequest,
          raw_coords: { deliveryLatitude, deliveryLongitude },
          rounded_coords: {
            lat: roundCoordinate(deliveryLatitude),
            lng: roundCoordinate(deliveryLongitude),
          },
        });
        const feeResponse = await calculateDeliveryFee(deliveryFeeRequest); // Check if delivery is possible
        if ((feeResponse as any).is_deliverable === false) {
          setDeliveryFee(0);
          setCalculatingFee(false);
          const message =
            (feeResponse as any).delivery_area_message ||
            "This address is outside our delivery area";

          // Only show toast if message changed to prevent duplicates
          if (message !== lastDeliveryErrorRef.current) {
            showSimpleToast(message, "failed");
            logger.warn("⚠️ Delivery not available:", message);
            lastDeliveryErrorRef.current = message;
          }
          return;
        }

        // Clear error if delivery becomes available
        lastDeliveryErrorRef.current = null;

        setDeliveryFee(Number(feeResponse.delivery_fee) || 0);
        setCalculatingFee(false);
      } catch (e) {
        logger.warn("Auto delivery fee calculation failed", e);
        setCalculatingFee(false);

        // If cart not found error (after order completion), reset delivery state
        if (
          e instanceof Error &&
          (e.message.includes("Cart not found") || e.message.includes("404"))
        ) {
          logger.info(
            "🚚 Cart not found (likely after order completion) - resetting delivery state",
          );
          setDeliveryFee(0);
          setDeliveryAvailability({
            isDeliverable: false,
            message: "Please add items to your cart first",
            estimatedTime: "",
          });
          return;
        }

        // If it's an "Address outside delivery area" error, set delivery as unavailable
        if (
          e instanceof Error &&
          e.message.includes("Address outside delivery area")
        ) {
          setDeliveryAvailability({
            isDeliverable: false,
            message: "Address is outside our delivery area",
            estimatedTime: "",
          });
          setDeliveryFee(0);
        }
      }
    }, 450); // debounce ~450ms

    setDeliveryDebounceTimer(timer as any);

    return () => {
      if (deliveryDebounceTimer) {
        clearTimeout(deliveryDebounceTimer);
        setDeliveryDebounceTimer(null);
      }
    };
  }, [
    deliveryAddress,
    deliveryLatitude,
    deliveryLongitude,
    backendCartId,
    selectedOutlet?.id,
    items.length,
  ]);

  // Fetch Paystack public key once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getPaymentConfig();
        if (mounted && cfg?.public_key) setPaystackPublicKey(cfg.public_key);
      } catch (e) {
        logger.warn("Unable to fetch payment config, using env key");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getTokenFromCookies = (): string | null => {
    try {
      return getCookie("userToken");
    } catch (error) {
      logger.error("Error reading token from cookies:", error);
      return null;
    }
  };

  useEffect(() => {
    debugCookies();
  }, []);

  // Listen for auto-detected location events and update delivery fields
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const { latitude, longitude, formattedAddress } = e?.detail || {};
        if (latitude && longitude) {
          setDeliveryLatitude(Number(latitude));
          setDeliveryLongitude(Number(longitude));
          if (formattedAddress) setDeliveryAddress(formattedAddress);
          setResolvingManualAddress(false);
          // Notify other parts of the app (outlet selector) to pick nearest
          try {
            window.dispatchEvent(
              new CustomEvent("shouldPickNearestOutlet", {
                detail: { latitude, longitude },
              }),
            );
          } catch (err) {}
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener("detectedLocation", handler as EventListener);
    return () =>
      window.removeEventListener("detectedLocation", handler as EventListener);
  }, []);

  // Listen for coordinates updates from GPS/map picker in delivery modal
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const { latitude, longitude, formattedAddress } = e?.detail || {};
        if (latitude && longitude) {
          logger.info("🔄 Coordinates updated via delivery modal GPS:", {
            latitude,
            longitude,
            formattedAddress,
          });
          setDeliveryLatitude(Number(latitude));
          setDeliveryLongitude(Number(longitude));
          if (formattedAddress) setDeliveryAddress(formattedAddress);
        }
      } catch (err) {
        logger.warn("Error handling coordinates update:", err);
      }
    };

    window.addEventListener("coordinatesUpdated", handler as EventListener);
    return () =>
      window.removeEventListener(
        "coordinatesUpdated",
        handler as EventListener,
      );
  }, []);

  useEffect(() => {
    const handleCoordinatesCleared = () => {
      setResolvingManualAddress(false);
      setDeliveryLatitude(undefined);
      setDeliveryLongitude(undefined);
    };
    window.addEventListener("coordinatesCleared", handleCoordinatesCleared);
    return () =>
      window.removeEventListener(
        "coordinatesCleared",
        handleCoordinatesCleared,
      );
  }, []);

  // When coordinates are detected, fetch outlets and pick the nearest one
  useEffect(() => {
    const handler = async (e: any) => {
      try {
        const { latitude, longitude } = e?.detail || {};
        if (!latitude || !longitude) return;

        const outlets = await getAllOutlets();
        if (!outlets || outlets.length === 0) return;

        // Haversine distance
        const toRad = (deg: number) => deg * (Math.PI / 180);
        const haversine = (
          lat1: number,
          lon1: number,
          lat2: number,
          lon2: number,
        ) => {
          const R = 6371; // km
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
              Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        let nearest = outlets[0];
        let nearestDist = Number.POSITIVE_INFINITY;

        outlets.forEach((o: any) => {
          if (!o.latitude || !o.longitude) return;
          const d = haversine(
            latitude,
            longitude,
            Number(o.latitude),
            Number(o.longitude),
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearest = o;
          }
        });

        if (nearest) {
          // Set selected outlet via outlet store
          try {
            const so = require("@/src/store/OutletStore").useOutletStore;
            so.getState().setSelectedOutlet(nearest);
            // console.info('Picked nearest outlet based on coordinates:', nearest?.name || nearest?.id);
          } catch (err) {
            console.warn("Unable to set nearest outlet via store", err);
          }
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener(
      "shouldPickNearestOutlet",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "shouldPickNearestOutlet",
        handler as EventListener,
      );
  }, []);

  // Single useEffect for cart initialization with better dependency management
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const initializePage = async () => {
      if (selectedOutlet?.id && isMounted) {
        logger.info(
          "🏪 CART PAGE - Initializing for outlet:",
          selectedOutlet.id,
        );

        // Check if we already have a cart for this outlet to avoid re-initialization
        if (backendCartId && items.length > 0) {
          logger.info(
            "🛒 CART PAGE - Cart already exists with",
            items.length,
            "items, Backend ID:",
            backendCartId,
          );
          setLoading(false);
          return;
        }
        logger.info(
          "🛒 CART PAGE - Initializing cart for outlet to ensure sync",
        );

        try {
          setLoading(true);

          // Use the cart store's built-in initialization which handles session management
          await initializeCartForOutlet(selectedOutlet.id);
          if (isMounted) {
            logger.info("🛒 CART PAGE - Initialization complete");
            logger.debug("🛒 CART PAGE - Current cart items:", items);
            logger.info("🛒 CART PAGE - Backend cart ID:", backendCartId);
          }
        } catch (error) {
          logger.error("❌ Failed to initialize cart:", error);
          if (isMounted) {
            showSimpleToast("Failed to load cart", "error");
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else if (isMounted) {
        setLoading(false);
      }
    };

    initializePage();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, [selectedOutlet?.id, backendCartId]); // 🔥 FIXED: Removed items.length to prevent re-init when cart clears

  // Use centralized auth store to determine authentication status
  const isAuthenticated = () => isUserAuthenticated();

  // Load user profile when authenticated
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isUserAuthenticated()) {
        try {
          const profile = await getUserProfile();
          setUserProfile(profile);

          // Pre-fill phone number if available
          if (profile.phone && !deliveryPhone) {
            setDeliveryPhone(profile.phone);
          }

          // Pre-fill address from saved addresses if available
          if (profile.addresses && profile.addresses.length > 0 && !deliveryAddress) {
            // Find default or take first
            const defaultAddr = profile.addresses.find((a: any) => a.is_default) || profile.addresses[0];
            if (defaultAddr && defaultAddr.address_text) {
              setDeliveryAddress(defaultAddr.address_text);
              logger.info("✅ Auto-filled address from profile:", defaultAddr.address_text);
              
              if (defaultAddr.latitude && defaultAddr.longitude) {
                setDeliveryLatitude(Number(defaultAddr.latitude));
                setDeliveryLongitude(Number(defaultAddr.longitude));
                // Dispatch event so map/modals know about it
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("coordinatesUpdated", {
                      detail: {
                        latitude: Number(defaultAddr.latitude),
                        longitude: Number(defaultAddr.longitude),
                        formattedAddress: defaultAddr.address_text,
                      },
                    })
                  );
                }
              }
            }
          }
        } catch (error) {
          logger.error("Failed to load user profile:", error);
        }
      }
    };

    loadUserProfile();
  }, [isUserAuthenticated, deliveryPhone]);

  // Load email from localStorage in useEffect
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const authStorage = localStorage.getItem("userauth-storage");
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          const email = authData?.state?.user?.email;
          if (email && typeof email === "string") {
            setUserEmail(email);
            logger.info("✅ Email loaded from localStorage:", email);
          }
        }
      } catch (error) {
        logger.error("Error loading email from localStorage:", error);
      }
    }
  }, []);

  // Load delivery address and phone from localStorage (from address page)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedAddress = localStorage.getItem("deliveryAddress");
        const savedPhone = localStorage.getItem("customerPhone");
        const savedLatitude = localStorage.getItem("deliveryLatitude");
        const savedLongitude = localStorage.getItem("deliveryLongitude");

        if (savedAddress && !deliveryAddress) {
          setDeliveryAddress(savedAddress);
          logger.info(
            "✅ Delivery address loaded from localStorage:",
            savedAddress,
          );
        }

        if (savedPhone && !deliveryPhone) {
          setDeliveryPhone(savedPhone);
          logger.info(
            "✅ Customer phone loaded from localStorage:",
            savedPhone,
          );
        }

        if (savedLatitude && savedLongitude) {
          setDeliveryLatitude(parseFloat(savedLatitude));
          setDeliveryLongitude(parseFloat(savedLongitude));
          logger.info("✅ Delivery coordinates loaded from localStorage:", {
            lat: parseFloat(savedLatitude),
            lng: parseFloat(savedLongitude),
          });
        }
      } catch (error) {
        logger.error(
          "Error loading delivery details from localStorage:",
          error,
        );
      }
    }
  }, [deliveryAddress, deliveryPhone]);

  // Check for post-authentication redirect and auto-proceed to checkout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const autoCheckout = urlParams.get("autoCheckout");

      // If user just logged in and should auto-proceed to checkout
      if (
        autoCheckout === "true" &&
        isUserAuthenticated() &&
        items.length > 0
      ) {
        logger.info("🔄 Auto-proceeding to checkout after authentication");

        // Remove the query parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);

        // Add small delay to ensure auth state is fully loaded
        setTimeout(() => {
          setIsCheckoutModalOpen(true);
          // Use cart store's throttled toast to avoid duplicate messages when cart sync runs at the same time
          try {
            const { showThrottledToast } =
              require("@/src/store/CartStore").useCartStore.getState();
            showThrottledToast(
              "Welcome back! Proceeding to checkout...",
              "success",
            );
          } catch (e) {
            // Fallback to simple toast if store is not available
            showSimpleToast(
              "Welcome back! Proceeding to checkout...",
              "success",
            );
          }
        }, 500);
      }
    }
  }, [isUserAuthenticated, items.length]);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Paystack script will be loaded on demand by the payment helper

  // Don't render until we know the screen size
  if (isMobile === null) {
    return <div className="w-full min-h-screen bg-background"></div>;
  }

  // Login prompt modal (shown when user attempts checkout while unauthenticated)
  const LoginPromptModal = () => {
    if (!showLoginModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background p-6 rounded-lg w-[90%] max-w-md">
          <h3 className="text-lg font-bold mb-2">Login required</h3>
          <p className="mb-4">
            You need to be logged in to complete checkout. Please login to
            continue.
          </p>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded bg-neutral-200"
              onClick={() => setShowLoginModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-primary text-white"
              onClick={() => {
                setShowLoginModal(false);
                router.push("/onboarding");
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  };

  // const handleCheckOut = () => {
  //   setIsCheckoutModalOpen(true);
  // };
  const handleCheckOut = () => {
    // Check if user is authenticated
    if (!isUserAuthenticated()) {
      logger.info("🔐 User not authenticated, redirecting to onboarding");
      // Show modal prompting login (store redirect and allow user to confirm)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      }
      setShowLoginModal(true);
      return;
    }

    // If authenticated, proceed directly to checkout
    logger.info("✅ User authenticated, proceeding to checkout");
    setIsCheckoutModalOpen(true);
  };

  const handleLoveClick = (itemId: string) => {
    logger.info(`I love this item ${itemId}`);
  };

  const handleIncrement = async (itemId: string) => {
    if (!selectedOutlet?.id) return;
    const item = items.find(
      (item) => item.id === itemId || item.backendCartItemId === itemId,
    );
    if (item) {
      // Pass the product ID (item.id) to updateQuantity so it can find the item
      await updateQuantity(item.id, item.quantity + 1);
    }
  };

  const handleDecrement = async (itemId: string) => {
    if (!selectedOutlet?.id) return;
    const item = items.find(
      (item) => item.id === itemId || item.backendCartItemId === itemId,
    );
    if (item) {
      const newQuantity = item.quantity - 1;
      if (newQuantity <= 0) {
        await removeItem(item.id);
      } else {
        await updateQuantity(item.id, newQuantity);
      }
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedOutlet?.id) return;
    // Resolve the actual api id (backendCartItemId preferred)
    const item = items.find(
      (item) => item.id === itemId || item.backendCartItemId === itemId,
    );
    if (item) {
      await removeItem(item.id);
    }
  };
  const handleNavigateToHome = () => {
    router.push("/home");
  };

  const calculateTotalAmount = (item: CartItem) => {
    const priceNum = Number(String(item.price).replace(/,/g, ""));
    if (!isFinite(priceNum)) return 0;
    return item.quantity * priceNum;
  };

  const grandTotal = items.reduce((total, item) => {
    return total + calculateTotalAmount(item);
  }, 0);

  const totalItemsCount = getTotalQuantity();

  const handleMethodSelect = (method: string) => {
    // Check authentication before proceeding
    if (!isAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    logger.info("🚚 Delivery method selected:", method);
    setSelectedDeliveryMethod(method);
    setIsCheckoutModalOpen(false); // Close the method selection modal

    if (method === "delivery") {
      setIsDeliveryModalOpen(true); // Open delivery modal
    } else if (method === "pickup") {
      // For pickup, set delivery fee to 0 and go to checkout
      setDeliveryFee(0);
      setIsCheckOutModalOpen(true);
    }
  };

  const handleDeliverySelected = () => {
    setIsDeliveryModalOpen(true);
  };

  const handleFinalCheckout = async () => {
    if (resolvingManualAddress) {
      return;
    }

    if (selectedDeliveryMethod === "delivery") {
      const trimmedAddress = String(deliveryAddress || "").trim();
      const trimmedPhone = String(deliveryPhone || "").trim();

      if (!trimmedAddress) {
        showSimpleToast("Please enter a delivery address", "failed");
        return;
      }

      if (!trimmedPhone) {
        showSimpleToast("Please enter a phone number", "failed");
        return;
      }

      // Attempt to resolve manual addresses into coordinates if user typed but didn't pick a suggestion
      if (!deliveryLatitude || !deliveryLongitude) {
        setResolvingManualAddress(true);
        try {
          const resolved = await attemptGeocodeForTypedAddress(trimmedAddress);
          if (!resolved) {
            showSimpleToast(
              "We couldn't locate that address. Please refine it or drop a pin on the map.",
              "failed",
            );
            logger.warn("⚠️ Manual delivery address could not be geocoded", {
              address: trimmedAddress,
            });
            return;
          }
        } finally {
          setResolvingManualAddress(false);
        }
      }

      // Calculate delivery fee first
      if (backendCartId) {
        setCalculatingFee(true);
        try {
          const deliveryFeeRequest: DeliveryFeeRequest = {
            cart_id: backendCartId,
            delivery_address_text: deliveryAddress,
            fulfillment_mode: selectedDeliveryMethod || "delivery",
            ...(deliveryLatitude &&
              deliveryLongitude && {
                delivery_latitude: roundCoordinate(deliveryLatitude),
                delivery_longitude: roundCoordinate(deliveryLongitude),
              }),
          };

          logger.info("💰 DELIVERY FEE CALCULATION - Request:", {
            cart_id: backendCartId,
            address: deliveryAddress,
            coords: { lat: deliveryLatitude, lng: deliveryLongitude },
            rounded_coords: {
              lat: roundCoordinate(deliveryLatitude),
              lng: roundCoordinate(deliveryLongitude),
            },
          });

          const feeResponse = await calculateDeliveryFee(deliveryFeeRequest);
          logger.info("💰 DELIVERY FEE CALCULATION - Response:", feeResponse);

          // Check if delivery is possible
          if ((feeResponse as any).is_deliverable === false) {
            const message =
              (feeResponse as any).delivery_area_message ||
              "This address is outside our delivery area";
            showSimpleToast(message, "failed");
            logger.warn("⚠️ Delivery not available:", message);
            setCalculatingFee(false);
            return;
          }

          const calculatedFee = Number(feeResponse.delivery_fee) || 0;
          setDeliveryFee(calculatedFee);
          logger.info("💰 Delivery fee SET to:", calculatedFee);
        } catch (error) {
          logger.error("❌ Failed to calculate delivery fee:", error);
          showSimpleToast("Failed to calculate delivery fee", "failed");
          setCalculatingFee(false);
          return;
        } finally {
          setCalculatingFee(false);
        }
      } else {
        logger.warn("⚠️ Cannot calculate delivery fee - no backendCartId");
        showSimpleToast("Cart not initialized. Please try again.", "failed");
        return;
      }
    }

    logger.info("Proceeding to checkout with:", {
      method: selectedDeliveryMethod,
      address: deliveryAddress,
      phone: deliveryPhone,
    });

    setIsDeliveryModalOpen(false);
    setIsCheckOutModalOpen(true);

    logger.info("📋 Opening checkout modal with:", {
      selectedMethod: selectedDeliveryMethod,
      deliveryFee: selectedDeliveryMethod === "pickup" ? 0 : deliveryFee,
      grandTotal,
      totalWithDelivery:
        grandTotal + (selectedDeliveryMethod === "pickup" ? 0 : deliveryFee),
      deliveryAddress,
      calculatingFee,
    });
  };

  const enhancedCartItems = items.map((item) => ({
    ...item,
    delivery_time: "20 - 30mins", // You can make this dynamic if needed
    totalAmount: calculateTotalAmount(item),
    basePrice: item.price, // For compatibility with existing components
    formattedPrice: (Number(item.price) || 0).toLocaleString(), // Formatted price for display
  }));

  const handlePaymentSuccess = async (reference: string, orderId?: string) => {
    try {
      showSimpleToast("Payment completed. Verifying with server...", "info");
      logger.info("💳 Payment reference:", reference, "orderId:", orderId);

      // 🔥 Trigger orders page refresh immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("order:updated", { detail: { orderId, reference } }),
        );
      }

      showSimpleToast("Payment successful! Processing order...", "success");

      // If we have an orderId, check backend status and navigate accordingly
      if (orderId) {
        try {
          const statusResp = await getPaymentStatus(orderId);
          const paymentStatus = statusResp.payment_status || "";

          // Navigate to tracking if payment confirmed, otherwise to orders list
          if (paymentStatus === "success" || paymentStatus === "paid") {
            showSimpleToast(
              "Order confirmed. Redirecting to tracking...",
              "success",
            );
            // Use router.replace instead of push to prevent back navigation to cart with old items
            router.replace(`/home/tracking/${orderId}`);
            return;
          } else {
            // Payment still processing - webhook may not have run yet
            showSimpleToast(
              "Order created! Processing payment... Check orders page for updates.",
              "info",
            );
            router.replace("/home/orders");
            return;
          }
        } catch (e) {
          logger.error("Failed to get order status from server:", e);
          showSimpleToast(
            "Payment successful! Check orders page for your order.",
            "success",
          );
          router.replace("/home/orders");
          return;
        }
      }

      // Fallback: if no orderId provided, just clear cart and go to orders
      showSimpleToast("Payment processed. Redirecting to orders...", "success");
      router.replace("/home/orders");
    } catch (error) {
      logger.error("Error processing successful payment:", error);
      showSimpleToast("Payment processed. Redirecting...", "success");
      router.replace("/home/orders");
    }
  };

  const handleRealCheckout = async () => {
    // logger.debug("🛒 CHECKOUT DEBUG - Starting checkout process");
    // logger.debug("🛒 CHECKOUT DEBUG - Backend Cart ID:", backendCartId);
    // logger.debug("🛒 CHECKOUT DEBUG - Items count:", items.length);
    // logger.debug(
    //   "🛒 CHECKOUT DEBUG - Selected method:",
    //   selectedDeliveryMethod
    // );
    // logger.debug("🛒 CHECKOUT DEBUG - Outlet ID:", selectedOutlet?.id);
    // logger.debug("🛒 CHECKOUT DEBUG - Is authenticated:", isAuthenticated());

    if (!isAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    // Validate required information
    if (selectedDeliveryMethod === "delivery") {
      if (!String(deliveryAddress || "").trim()) {
        showSimpleToast("Please enter a delivery address", "failed");
        return;
      }
      if (!String(deliveryPhone || "").trim()) {
        showSimpleToast("Please enter a phone number", "failed");
        return;
      }
    } else if (!selectedDeliveryMethod) {
      showSimpleToast("Please select delivery or pickup", "failed");
      return;
    }

    if (!backendCartId) {
      logger.warn("❌ No backend cart ID found. Attempting to re-sync cart...");

      // Try to re-sync with backend first
      try {
        if (selectedOutlet?.id && items.length > 0) {
          logger.info("🔄 Attempting to re-create cart from current items...");
          // First try re-sync
          await reSyncCartWithBackend(selectedOutlet.id);
          // Check if re-sync gave us a cart ID
          let currentState = useCartStore.getState();
          if (currentState.backendCartId) {
            logger.info(
              "✅ Re-sync successful, got cart ID:",
              currentState.backendCartId,
            );
            // Continue with checkout
          } else {
            // Re-sync didn't work, try to re-initialize cart for outlet
            logger.warn(
              "🔄 Re-sync failed, attempting to re-initialize cart...",
            );
            await initializeCartForOutlet(selectedOutlet.id);
            // After initialization, check for backendCartId again
            currentState = useCartStore.getState();
            if (!currentState.backendCartId) {
              logger.error(
                "🔴 Failed to create backend cart after initialization",
              );
              showSimpleToast(
                "Failed to create backend cart. Please refresh and try again.",
                "failed",
              );
              setIsProcessingPayment(false);
              return;
            }
            logger.info(
              "✅ Cart created for outlet with ID:",
              currentState.backendCartId,
            );
          }
          // Get the updated cart ID and continue with checkout
          const finalCartId = useCartStore.getState().backendCartId;
          if (finalCartId) {
            logger.info("🛒 Proceeding with cart ID:", finalCartId);

            // Continue with the checkout flow using the valid cart ID
            const checkoutRequest: CheckoutRequest = {
              cart_id: finalCartId,
              fulfillment_mode: selectedDeliveryMethod as "delivery" | "pickup",
              customer_phone: deliveryPhone || userProfile?.phone || "",
              ...(selectedDeliveryMethod === "delivery" && {
                delivery_address_text: deliveryAddress,
              }),
              special_instructions: "Order from Norma app",
            };

            logger.debug(
              "🛒 Checkout request (after cart recovery):",
              checkoutRequest,
            );

            const checkoutResponse = await checkoutCart(checkoutRequest);
            logger.info("✅ Checkout response:", checkoutResponse);
            if (
              checkoutResponse &&
              (checkoutResponse as any).order &&
              !(checkoutResponse as any).order_id
            ) {
              const existingOrder = (checkoutResponse as any).order;
              logger.info(
                "🟡 Checkout detected existing order for this cart - clearing local cart and redirecting",
                existingOrder,
              );
              try {
                await clearCart(selectedOutlet?.id || "");
              } catch (e) {
                logger.warn(
                  "Failed to clear local cart after conflict response",
                  e,
                );
                const deliveryMessage = extractDeliveryErrorMessage(e);
                if (deliveryMessage) {
                  showSimpleToast(deliveryMessage, "failed");

                  // Important: stop checkout + payment
                  setIsProcessingPayment(false);
                  return;
                }

                // Fallback for unknown errors
                showSimpleToast(
                  "Unable to complete checkout. Please review your details and try again.",
                  "failed",
                );
                setIsProcessingPayment(false);
                return;
              }
              showSimpleToast(
                "This cart was already used to create an order. Redirecting to order details...",
                "info",
              );
              const orderId =
                existingOrder.id || existingOrder.order_code || "";
              if (orderId) router.push(`/home/tracking/${orderId}`);
              return;
            }

            // Show success notification for order creation
            if (checkoutResponse?.order_id) {
              showSimpleToast(
                `Order #${checkoutResponse.order_id} created successfully! Redirecting to payment...`,
                "success",
              );
            } else {
              showSimpleToast(
                "Order created successfully! Redirecting to payment...",
                "success",
              );
            }

            // Continue with payment flow...
            let finalEmail: string = userEmail || "";
            // Get verified email from authenticated user/profile
            if (!finalEmail && userProfile?.email)
              finalEmail = userProfile.email;
            const email_regex =
              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            if (!finalEmail || !email_regex.test(finalEmail)) {
              if (userProfile?.email && email_regex.test(userProfile.email)) {
                finalEmail = userProfile.email;
              } else {
                showSimpleToast("Please enter a valid email address", "failed");
                setIsProcessingPayment(false);
                return;
              }
            }

            logger.info("✅ Final email for Paystack:", finalEmail);
            const paymentAmount =
              checkoutResponse.total_amount || grandTotal + deliveryFee;
            try {
              // Close any open checkout dialogs before opening Paystack popup
              // to avoid the popup being blocked/overlapped by modal layers.
              try {
                setIsCheckOutModalOpen(false);
              } catch (e) {}
              try {
                setIsCheckoutModalOpen(false);
              } catch (e) {}

              setIsProcessingPayment(true);
              const trackingCallback = checkoutResponse?.order_id
                ? `${window.location.origin}/home/tracking/${checkoutResponse.order_id}`
                : `${window.location.origin}/home/orders`;

              try {
                const result = await startPaymentFlow({
                  orderId: checkoutResponse?.order_id,
                  amountNGN: paymentAmount,
                  email: finalEmail,
                  callbackUrl: trackingCallback,
                  paystackPublicKey,
                });
                if (result?.method === "redirect") {
                  const authUrl = (result as any).authorization_url;
                  const orderId = checkoutResponse?.order_id;
                  if (authUrl) {
                    try {
                      if (
                        typeof window !== "undefined" &&
                        window.localStorage
                      ) {
                        // Ensure a consistent pending marker is set before redirecting
                        window.localStorage.setItem(
                          "pending_order_payment",
                          JSON.stringify({ orderId, ts: Date.now() }),
                        );
                      }
                    } catch (e) {
                      logger.debug(
                        "Unable to set pending_order_payment in localStorage",
                        e,
                      );
                    }

                    // Redirect to hosted payment page
                    window.location.href = authUrl;
                    return;
                  }
                }
                // If we get here, initialization did not return a redirect URL
                showSimpleToast(
                  "Payment initialization failed. Please try again or contact support.",
                  "failed",
                );
                logger.error(
                  "Payment initialization returned no redirect URL",
                  result,
                );
              } catch (e) {
                logger.error("Payment initialization failed", e);
                showSimpleToast(
                  "Failed to start payment. Please try again later.",
                  "failed",
                );
              }

              // Fallback to popup
              const popupRes = await openPaystackPopup({
                key: paystackPublicKey,
                email: finalEmail,
                amount: Math.round(paymentAmount * 100),
              });
              await handlePaymentSuccess(popupRes.reference);
              return;
            } finally {
              setIsProcessingPayment(false);
            }
          }
        }
      } catch (resyncError) {
        logger.error("❌ Re-sync failed:", resyncError);
      }

      showSimpleToast(
        "Unable to prepare cart for checkout. Please try adding items again.",
        "failed",
      );
      setIsProcessingPayment(false);
      return;
    }

    setIsProcessingPayment(true);

    try {
      // First, create the order via checkout API
      const checkoutRequest: CheckoutRequest = {
        cart_id: backendCartId,
        fulfillment_mode: selectedDeliveryMethod as "delivery" | "pickup",
        customer_phone: deliveryPhone || userProfile?.phone || "",
        ...(selectedDeliveryMethod === "delivery" && {
          delivery_address_text: deliveryAddress,
          ...(deliveryLatitude &&
            deliveryLongitude && {
              delivery_latitude: roundCoordinate(deliveryLatitude),
              delivery_longitude: roundCoordinate(deliveryLongitude),
            }),
        }),
        special_instructions: "Order from Norma app",
      };

      logger.info("🛒 CHECKOUT - Request details:", {
        ...checkoutRequest,
        raw_coords: { deliveryLatitude, deliveryLongitude },
        rounded_coords: {
          lat: roundCoordinate(deliveryLatitude),
          lng: roundCoordinate(deliveryLongitude),
        },
      });

      const checkoutResponse = await checkoutCart(checkoutRequest);
      logger.info("✅ Checkout response:", checkoutResponse);

      // 🔥 IMMEDIATELY clear cart since order is created - don't wait for payment completion
      logger.info("🗑️ Clearing cart immediately after order creation...");
      try {
        // Force clear local state and storage BEFORE calling clearCart API
        if (typeof window !== "undefined") {
          try {
            // Clear ALL cart-related localStorage to prevent rehydration
            const allKeys = Object.keys(localStorage);
            const cartKeys = allKeys.filter(
              (key) => key.startsWith("cart_") || key === "cart-storage",
            );
            cartKeys.forEach((key) => {
              localStorage.removeItem(key);
              logger.info("🗑️ Removed localStorage key:", key);
            });

            // Mark cart as intentionally cleared
            localStorage.setItem(
              "cart_cleared_marker",
              JSON.stringify({
                ts: Date.now(),
                orderId: checkoutResponse?.order_id,
              }),
            );
            logger.info(
              "✅ Cart cleared from localStorage after order creation",
            );
          } catch (e) {
            logger.warn("⚠️ Failed to clear cart from localStorage", e);
          }
        }

        // Now call the API to clear backend cart
        await clearCart(selectedOutlet?.id || "");
      } catch (e) {
        logger.warn("Failed to clear cart after order creation:", e);
      }

      // Order created successfully - no toast needed, proceeding to payment directly

      // Now initialize payment with the order details
      let finalEmail: string = userEmail || "";
      // Get verified email from authenticated user/profile
      if (!finalEmail && userProfile?.email) finalEmail = userProfile.email;
      const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!finalEmail || !email_regex.test(finalEmail)) {
        // Try to get email from user profile
        if (userProfile?.email && email_regex.test(userProfile.email)) {
          finalEmail = userProfile.email;
        } else {
          showSimpleToast("Please enter a valid email address", "failed");
          setIsProcessingPayment(false);
          return;
        }
      }

      logger.info("✅ Final email for Paystack:", finalEmail);

      // Use the total from checkout response
      const paymentAmount =
        checkoutResponse.total_amount || grandTotal + deliveryFee;

      // Prefer server-side payment initialization via centralized helper; fallback to popup
      try {
        // Close any open checkout dialogs before opening Paystack popup
        try {
          setIsCheckOutModalOpen(false);
        } catch (e) {}
        try {
          setIsCheckoutModalOpen(false);
        } catch (e) {}

        setIsProcessingPayment(true);
        const result = await startPaymentFlow({
          orderId: checkoutResponse?.order_id,
          amountNGN: paymentAmount,
          email: finalEmail,
          callbackUrl: `${window.location.origin}/home/orders`,
          paystackPublicKey,
        });

        if (result?.method === "popup" && result.reference) {
          // Popup completed successfully
          await handlePaymentSuccess(result.reference);
          return;
        }

        if (result?.method === "redirect") {
          // Server provided hosted checkout URL - redirect to payment page
          const authUrl = (result as any).authorization_url;
          if (authUrl) {
            logger.info("🔗 Redirecting to payment URL:", authUrl);
            try {
              if (typeof window !== "undefined" && window.localStorage) {
                // Ensure a consistent pending marker is set before redirecting
                window.localStorage.setItem(
                  "pending_order_payment",
                  JSON.stringify({
                    orderId: checkoutResponse?.order_id,
                    ts: Date.now(),
                  }),
                );
              }
            } catch (e) {
              logger.debug(
                "Unable to set pending_order_payment in localStorage",
                e,
              );
            }

            window.location.href = authUrl;
            return;
          } else {
            logger.error(
              "❌ Redirect method but no authorization_url provided",
            );
            showSimpleToast(
              "Payment redirect URL not available. Please try again.",
              "failed",
            );
          }
        }

        // If result is null, fallback to direct popup
        try {
          const popupRes = await openPaystackPopup({
            key: paystackPublicKey,
            email: finalEmail,
            amount: Math.round(paymentAmount * 100),
          });
          await handlePaymentSuccess(popupRes.reference);
          return;
        } catch (popupErr) {
          logger.error("Popup fallback failed:", popupErr);
        }
      } finally {
        setIsProcessingPayment(false);
      }
    } catch (error: any) {
      logger.error("❌ Checkout failed:", error);
      const deliveryMessage = extractDeliveryErrorMessage(error);

      if (deliveryMessage) {
        showSimpleToast(deliveryMessage, "failed");
        setIsProcessingPayment(false);
        return;
      }
      showSimpleToast(
        "Unable to complete checkout. Please review your delivery address and try again.",
        "failed",
      );
      setIsProcessingPayment(false);
    }
  };

  // Payment handled via centralized helper (startPaymentFlow / openPaystackPopup)
  return (
    <div className="p-3 md:p-0 bg-background-dark md:bg-background-lighter min-h-screen">
      <MobileNavigation />
      <DesktopNavigation />

      {items.length === 0 ? (
        // Empty Cart State
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 mt-10">
          {/* Cart Icon */}
          <div className="mb-6 bg-[#737373] p-4 md:p-8 rounded-full">
            <span className="text-2xl md:text-3xl text-background-lighter">
              <BsCartCheck />
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Your cart is empty
          </h2>
          <p className="text-foreground-lighter mb-8 text-center max-w-md">
            Looks like you haven't added any delicious food to your cart yet.
          </p>
          {/* Navigation Button */}
          <CustomButton
            title="Browse Food Items"
            others="px-8 py-4 rounded-full text-lg md:w-fit"
            handleClick={handleNavigateToHome}
          />
        </div>
      ) : (
        // Cart with Items
        <div className="px-3 md:px-16">
          {/* Authentication reminder for unauthenticated users */}
          {!isUserAuthenticated() && items.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 mt-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Login Required for Checkout
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    You'll need to sign in to complete your order. Don't worry,
                    your cart items will be saved!
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 md:flex justify-end hidden">
            <CustomButton
              others="w-fit px-8"
              title={isUserAuthenticated() ? "Checkout" : "Login to Checkout"}
              handleClick={() => {
                if (!isProcessingPayment) handleCheckOut();
              }}
              disabled={isProcessingPayment}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 mt-8 mb-5">
            {items.map((item, idx) => {
              const totalAmount = calculateTotalAmount(item);

              return (
                <CartCard
                  key={item.backendCartItemId ?? `${item.id}-${idx}`}
                  handleLoveClick={() => handleLoveClick(item.id)}
                  image={item.image}
                  title={item.title}
                  sub_title={item.sub_title}
                  price={(Number(item.price) || 0).toLocaleString()}
                  amount={totalAmount}
                  delivery_time="20 - 30mins" // You can make this dynamic
                  handleDecrement={() => handleDecrement(item.id)}
                  handleIncrement={() => handleIncrement(item.id)}
                  quantity={item.quantity}
                />
              );
            })}
          </div>

          <div className="mt-5 md:hidden">
            <CustomButton
              others="px-8"
              title={isUserAuthenticated() ? "Checkout" : "Login to Checkout"}
              handleClick={() => {
                if (!isProcessingPayment) handleCheckOut();
              }}
              disabled={isProcessingPayment}
            />
          </div>
        </div>
      )}
      <Method
        isCheckoutModalOpen={isCheckoutModalOpen}
        setIsCheckoutModalOpen={setIsCheckoutModalOpen}
        onMethodSelect={handleMethodSelect}
      />
      {/* Render login prompt modal (was defined but not mounted) */}
      <LoginPromptModal />
      {isMobile ? (
        <DeliveryMobileModal
          isOpen={isDeliveryModalOpen}
          setIsOpen={setIsDeliveryModalOpen}
          deliveryAddress={deliveryAddress}
          deliveryPhone={deliveryPhone}
          setDeliveryAddress={setDeliveryAddress}
          setDeliveryPhone={setDeliveryPhone}
          onCheckout={handleFinalCheckout}
          isResolvingAddress={resolvingManualAddress}
        />
      ) : (
        <DeliveryModal
          isOpen={isDeliveryModalOpen}
          setIsOpen={setIsDeliveryModalOpen}
          deliveryAddress={deliveryAddress}
          deliveryPhone={deliveryPhone}
          setDeliveryPhone={setDeliveryPhone}
          setDeliveryAddress={setDeliveryAddress}
          onCheckout={handleFinalCheckout}
          isResolvingAddress={resolvingManualAddress}
        />
      )}

      {isMobile ? (
        <CheckOutMobile
          isOpen={isCheckOutModalOpen}
          onClose={setIsCheckOutModalOpen}
          cartItems={enhancedCartItems}
          grandTotal={grandTotal}
          deliveryFee={selectedDeliveryMethod === "pickup" ? 0 : deliveryFee}
          handleIncrement={handleIncrement}
          handleDecrement={handleDecrement}
          handleLoveClick={handleLoveClick}
          onCheckout={handleRealCheckout}
          selectedMethod={selectedDeliveryMethod}
          deliveryAddress={deliveryAddress}
          calculatingFee={calculatingFee}
          isProcessingPayment={isProcessingPayment}
        />
      ) : (
        <CheckOutDesktop
          isOpen={isCheckOutModalOpen}
          onClose={setIsCheckOutModalOpen}
          cartItems={enhancedCartItems}
          grandTotal={grandTotal}
          deliveryFee={selectedDeliveryMethod === "pickup" ? 0 : deliveryFee}
          handleIncrement={handleIncrement}
          handleDecrement={handleDecrement}
          handleLoveClick={handleLoveClick}
          onCheckout={handleRealCheckout} // Your final checkout logic
          selectedMethod={selectedDeliveryMethod}
          deliveryAddress={deliveryAddress}
          calculatingFee={calculatingFee}
          isProcessingPayment={isProcessingPayment}
        />
      )}
    </div>
  );
};

export default Page;
