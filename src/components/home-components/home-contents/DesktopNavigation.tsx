import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ShoppingBag, LogOut, Bell } from "lucide-react";
import CartIcon from "@/src/ui/cart-icon";
import Norma from "@/src/assets/images/norma-text-logo.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/ui/avatar";
import { useAuthStore } from "@/src/store/authStore";
import { useCartStore } from "@/src/store/CartStore";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import useNotificationStore, {
  NotificationState,
} from "@/src/store/NotificationStore";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";
import { logger } from "@/src/utils/logger";

const DesktopNavigation: React.FC = () => {
  const router = useRouter();
  const {
    user,
    fetchUserProfile,
    logout,
    getDisplayName,
    isUserAuthenticated,
  } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Subscribe directly to the total quantity for optimal performance
  const totalQuantity = useCartStore((state) => state.getTotalQuantity());

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

  const displayName = getDisplayName();
  const userEmail = user.email || "";

  const unreadCount = useNotificationStore(
    (s: NotificationState) => s.unreadCount
  );
  const fetchUnreadCount = useNotificationStore(
    (s: NotificationState) => s.fetchUnreadCount
  );

  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (isHydrated && isAuthenticated) {
      fetchUnreadCount().catch((error) => {
        // Silent fail for notification count - not critical
        logger.debug("Could not fetch notification count:", error);
      });
    }
  }, [isHydrated, isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    const initializeUser = async () => {
      if (isUserAuthenticated() && !user.email) {
        try {
          await fetchUserProfile();
        } catch (error: any) {
          if (error?.message?.includes("No authentication token")) {
            logger.debug("DesktopNavigation: user not authenticated yet");
          } else {
            logger.error(
              "DesktopNavigation failed to fetch user profile",
              error
            );
          }
        }
      }
    };

    initializeUser();
  }, [fetchUserProfile, isUserAuthenticated, user.email]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      showSimpleToast("Logged out successfully!", "success");
      router.push("/onboarding");
    } catch (error: any) {
      showSimpleToast("Logout failed. Please try again.", "failed");
      logger.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hidden md:block bg-black w-full px-6 md:px-16 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/home">
          <Image
            src={Norma}
            alt="Norma logo"
            width={117}
            height={37}
            className="object-contain h-auto w-auto"
          />
        </Link>

        {/* Center links removed per design. Cart shown next to profile/sign-in. */}

        <div className="flex items-center">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href="/home/cart"
                className="relative inline-flex text-white dark:text-black"
              >
                <CartIcon size={26} className="text-white dark:text-black" />
                {isHydrated && totalQuantity > 0 && (
                  <span className="bg-[#FD1414] flex justify-center items-center text-white rounded-full text-[10px] absolute -top-2 -right-2 w-4 h-4 font-medium">
                    {totalQuantity}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={
                        normalizeCloudinaryUrl(user.profile_pic) || undefined
                      }
                      alt="User avatar"
                    />
                    <AvatarFallback className="bg-gray-600 text-white">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="text-gray-400 text-xs">{userEmail}</p>
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg">
                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <Link href="/home/profile">
                      <User className="w-4 h-4" />
                      <span>Profile Details</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <Link href="/home/orders">
                      <ShoppingBag className="w-4 h-4" />
                      <span>Orders</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <Link href="/home/notifications">
                      <Bell className="w-4 h-4" />
                      <div className="flex items-center justify-between w-full">
                        <span>Notifications</span>
                        {isHydrated && unreadCount > 0 ? (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer text-red-600"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{loading ? "Signing out..." : "Sign Out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/home/cart"
                className="relative inline-flex text-white dark:text-black"
              >
                <CartIcon size={26} className="text-white dark:text-black" />
                {isHydrated && totalQuantity > 0 && (
                  <span className="bg-[#FD1414] flex justify-center items-center text-white rounded-full text-[10px] absolute -top-2 -right-2 w-4 h-4 font-medium">
                    {totalQuantity}
                  </span>
                )}
              </Link>

              <Link
                href="/onboarding"
                className="bg-grey hover:bg-grey/90 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopNavigation;
