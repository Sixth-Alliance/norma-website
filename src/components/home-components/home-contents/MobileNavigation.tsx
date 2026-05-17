"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, User, ShoppingBag, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import NormaLogo from "@/src/assets/images/norma-logo.svg";
import CartIcon from "@/src/ui/cart-icon";
import HambuggerIcon from "@/src/assets/images/hamburger.svg";
import { useCartStore } from "@/src/store/CartStore";
import { useOutletStore } from "@/src/store/OutletStore";
import { IoClose } from "react-icons/io5";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/ui/avatar";
import { useAuthStore } from "@/src/store/authStore";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import useNotificationStore, { NotificationState } from '@/src/store/NotificationStore';
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";
import { logger } from "@/src/utils/logger";

const MobileNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [openNav, setOpenNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Subscribe directly to quantities and outlet mapping for optimal performance
  const totalUniqueQuantity = useCartStore((state) => state.getTotalQuantity());
  const totalItemQuantity = useCartStore((state) => state.getTotalItemQuantity());
  const cartCurrentOutletId = useCartStore((state) => state.currentOutletId);
  const initializeCartForOutlet = useCartStore((state) => state.initializeCartForOutlet);
  const selectedOutlet = useOutletStore((s) => s.selectedOutlet);
  // Auth store
  const { user, fetchUserProfile, logout, getDisplayName, isUserAuthenticated } = useAuthStore();

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Re-check authentication status when component mounts or user changes
  useEffect(() => {
    if (isHydrated) {
      const authStatus = isUserAuthenticated();
      setIsAuthenticated(authStatus);
    }
  }, [isHydrated, isUserAuthenticated, user]);

  // Fetch user profile on component mount if authenticated
  useEffect(() => {
    const initializeUser = async () => {
      if (isAuthenticated && !user.email) {
        try {
          await fetchUserProfile();
        } catch (error: any) {
          if (error?.message?.includes("No authentication token")) {
            logger.debug("MobileNavigation: user not authenticated yet");
          } else {
            logger.error("MobileNavigation failed to fetch user profile", error);
          }
        }
      }
    };

    initializeUser();
  }, [fetchUserProfile, isAuthenticated, user.email]);

  const isCartPage = pathname === "/home/cart";

  // Prevent body scroll when nav is open
  useEffect(() => {
    if (openNav) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [openNav]);

  const handleCloseNav = () => {
    setOpenNav(false);
  };

  const handleOpenNav = () => {
    setOpenNav(true);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      showSimpleToast("Logged out successfully!", "success");
      setOpenNav(false);
      router.push("/onboarding");
    } catch (error: any) {
      showSimpleToast("Logout failed. Please try again.", "failed");
      logger.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = getDisplayName();
  const userEmail = user.email || "";
  const unreadCount = useNotificationStore((s: NotificationState) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s: NotificationState) => s.fetchUnreadCount);
  

  // Don't render cart badge until hydrated to prevent hydration mismatch
  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (isHydrated && isAuthenticated) {
      fetchUnreadCount().catch((error) => {
        // Silent fail for notification count - not critical
        logger.debug("Could not fetch notification count:", error);
      });
    }
  }, [isHydrated, isAuthenticated, fetchUnreadCount]);

  if (!isHydrated) {
    return (
  <div className="md:hidden mt-3 px-4 flex justify-between items-center">
        {isCartPage ? (
          <div className="flex items-center gap-5">
            <span
              className="bg-background p-2 rounded-full"
              onClick={() => router.back()}
            >
              <ArrowLeft />
            </span>
            <p className="text-2xl font-semibold">Cart</p>
          </div>
        ) : (
          <Image src={NormaLogo} alt="Norma logo" width={80} height={26} className="h-auto w-auto" />
        )}

        <div className="flex gap-6 items-center">
          <div className="relative">
            <button
              onClick={async () => {
                // Ensure cart is initialized for the selected outlet before navigating
                try {
                  if (selectedOutlet && selectedOutlet.id) {
                    await initializeCartForOutlet(selectedOutlet.id);
                  }
                } catch (e) {
                  logger.warn('Failed to init cart before navigating to cart', e);
                }
                router.push('/home/cart');
              }}
              aria-label="Open cart"
              className="inline-flex"
            >
              <CartIcon size={22} className="text-black dark:text-white" />
            </button>
          </div>
          <Image
            src={HambuggerIcon}
            alt="Menu toggle"
            width={27}
            height={14}
            onClick={handleOpenNav}
            className="h-auto w-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <>
  <div className="md:hidden mt-3 px-4 flex justify-between items-center">
        {isCartPage ? (
          <div className="flex items-center gap-5">
            <span
              className="bg-background p-2 rounded-full"
              onClick={() => router.back()}
            >
              <ArrowLeft />
            </span>
            <p className="text-2xl font-semibold">Cart</p>
          </div>
        ) : (
          <Image src={NormaLogo} alt="Norma logo" width={80} height={26} priority className="h-auto w-auto" />
        )}

        <div className="flex gap-6 items-center">
          <div className="relative">
            <Link href="/home/cart" className="inline-flex">
              <CartIcon size={22} className="text-black dark:text-white" />
            </Link>
            {totalItemQuantity > 0 && (
              <span className="bg-[#FD1414] flex items-center justify-center text-white rounded-full text-[10px] absolute -top-1 -right-2 w-4 h-4">
                {totalItemQuantity}
              </span>
            )}
          </div>
          <Image
            src={HambuggerIcon}
            alt="Menu toggle"
            width={27}
            height={14}
            onClick={handleOpenNav}
            className="h-auto w-auto"
          />
        </div>
      </div>

      {/* Rest of your navigation code remains the same */}
      <div
        className={`fixed inset-0 bg-black/30 bg-opacity-50 z-40 transition-opacity duration-300 ${
          openNav ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleCloseNav}
      />

      <div
        className={`fixed top-0 left-0 h-full w-full max-w-xs bg-black text-background z-50 transform transition-transform duration-300 ease-in-out ${
          openNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header (show user profile here when authenticated) */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800 relative">
            {isAuthenticated ? (
              <Link href="/home/profile" onClick={handleCloseNav} className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={normalizeCloudinaryUrl(user.profile_pic) || undefined} 
                    alt="User avatar" 
                  />
                  <AvatarFallback className="bg-gray-600 text-white">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-white text-sm font-medium">{displayName}</p>
                  <p className="text-gray-400 text-xs truncate">{userEmail}</p>
                </div>
              </Link>
            ) : (
              <Image src={NormaLogo} alt="Norma Logo" width={70} height={22} priority className="h-auto w-auto" />
            )}

            {/* Close button positioned absolutely to avoid overlap with cart in header */}
            <button
              onClick={handleCloseNav}
              className="right-3 text-2xl text-background hover:text-orange transition-colors  rounded-md"
              aria-label="Close navigation"
            >
              <IoClose />
            </button>
          </div>

          {/* Navigation Links */}
          {/* <div className="flex-1 p-4">
            <ul className="space-y-3">
              <li>
                <Link
                  href="/home/menu"
                  onClick={handleCloseNav}
                  className="flex items-center gap-3 text-base font-medium hover:text-orange transition-colors w-full py-3 px-2 rounded-lg hover:bg-gray-800/50"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Menu</span>
                </Link>
              </li>
              
              <li>
                <Link
                  href="/home/outlets"
                  onClick={handleCloseNav}
                  className="flex items-center gap-3 text-base font-medium hover:text-orange transition-colors w-full py-3 px-2 rounded-lg hover:bg-gray-800/50"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span>Outlets</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/home/about"
                  onClick={handleCloseNav}
                  className="flex items-center gap-3 text-base font-medium hover:text-orange transition-colors w-full py-3 px-2 rounded-lg hover:bg-gray-800/50"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span>About</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/home/contact"
                  onClick={handleCloseNav}
                  className="flex items-center gap-3 text-base font-medium hover:text-orange transition-colors w-full py-3 px-2 rounded-lg hover:bg-gray-800/50"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span>Contact</span>
                </Link>
              </li>
            </ul>
          </div> */}

          {/* Profile Actions */}
          {isAuthenticated ? (
            <div className="p-4 border-t border-gray-800">
              <ul className="space-y-1">

                 <li>
                <Link
                  href="/home/menu"
                  onClick={handleCloseNav}
                  className="flex items-center gap-3 text-base font-medium hover:text-orange transition-colors w-full py-1.5  rounded-lg hover:bg-gray-800/50"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Menu</span>
                </Link>
              </li>
                <li>
                  <Link
                    href="/home/profile"
                    onClick={handleCloseNav}
                    className="flex items-center gap-2 text-sm font-medium hover:text-orange transition-colors w-full py-1.5"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Details</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/home/orders"
                    onClick={handleCloseNav}
                    className="flex items-center gap-2 text-sm font-medium hover:text-orange transition-colors w-full py-1.5"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Orders</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/home/notifications"
                    onClick={handleCloseNav}
                    className="flex items-center justify-between text-sm font-medium hover:text-orange transition-colors w-full py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <span>Notifications</span>
                    </div>
                    {isHydrated && unreadCount > 0 ? (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    ) : null}
                  </Link>
                </li>

                <li>
                  <button
                    className="flex items-center gap-2 text-sm font-medium hover:text-red-400 transition-colors w-full py-1.5 text-red-500"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{loading ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-800">
              <Link
                href="/onboarding"
                className="block bg-grey  hover:bg-grey/90 text-white px-4 py-2 rounded-lg transition-colors font-medium text-center"
                onClick={handleCloseNav}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
