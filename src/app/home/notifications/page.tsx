"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/authStore";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  getAuthToken,
  Notification,
  NotificationsResponse,
} from "@/src/app/api/action";
import { logger } from '@/src/utils/logger';
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { Button } from "@/src/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/ui/card";
import { Badge } from "@/src/ui/badge";
import { Skeleton } from "@/src/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/ui/tabs";
import { 
  ArrowLeft, 
  Bell, 
  CheckCheck, 
  Package, 
  Gift, 
  AlertCircle,
  Truck
} from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import useNotificationStore, { NotificationState } from '@/src/store/NotificationStore';

const NotificationsPage = () => {
  const router = useRouter();
  const { isUserAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationStoreUnread = useNotificationStore((s: NotificationState) => s.unreadCount);
  const setStoreUnread = useNotificationStore((s: NotificationState) => s.setUnreadCount);
  const decrementStoreUnread = useNotificationStore((s: NotificationState) => s.decrement);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    fetchNotifications();
    // initialize unread count from store (or fetch if zero)
    if (notificationStoreUnread === 0) {
      fetchUnreadCount();
    } else {
      setUnreadCount(notificationStoreUnread);
    }
  }, [isUserAuthenticated, router]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const unreadOnly = activeTab === "unread";
      const data: NotificationsResponse = await getNotifications(1, unreadOnly);
      setNotifications(data.results || []);
      try {
        const token = getAuthToken();
        if (token && (!data.results || data.results.length === 0)) {
          // Authenticated user but no notifications returned - log for investigation
          logger.debug('Notifications fetched for authenticated user but returned empty results', { unreadOnly, page: 1 });
        }
      } catch (e) {
        // Ignore logging failures
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      showSimpleToast("Failed to load notifications", "failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { count } = await getUnreadNotificationCount();
      setUnreadCount(count);
      // sync to global store
      setStoreUnread(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      await markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      // Update unread count both locally and in store
      setUnreadCount(prev => Math.max(0, prev - 1));
      decrementStoreUnread(1);
      
      showSimpleToast("Notification marked as read", "success");
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
      showSimpleToast("Failed to mark as read", "failed");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await markAllNotificationsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setUnreadCount(0);
      setStoreUnread(0);
      showSimpleToast("All notifications marked as read", "success");
    } catch (error: any) {
      console.error("Failed to mark all as read:", error);
      showSimpleToast("Failed to mark all as read", "failed");
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_update":
        return <Package className="h-5 w-5 text-blue-600" />;
      case "promotion":
        return <Gift className="h-5 w-5 text-green-600" />;
      case "delivery":
        return <Truck className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "order_update":
        return "Order Update";
      case "promotion":
        return "Promotion";
      case "delivery":
        return "Delivery";
      case "system":
        return "System";
      default:
        return "Notification";
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === "unread") return !notif.is_read;
    return true;
  });

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DesktopNavigation />
        <MobileNavigation />
        <div className="container mx-auto px-4 py-8 pt-5">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <Skeleton className="h-8 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopNavigation />
      <MobileNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} new</Badge>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead}
              variant="outline"
              size="sm"
            >
              {markingAllAsRead ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Marking...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </>
              )}
            </Button>
          )}
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Notifications</TabsTrigger>
                <TabsTrigger value="unread" className="flex items-center space-x-2">
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications"}
                </h3>
                <p className="text-gray-500">
                  {activeTab === "unread" 
                    ? "You're all caught up! Check back later for new updates."
                    : "You don't have any notifications yet."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${
                      notification.is_read 
                        ? "bg-white" 
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex flex-wrap gap-2 items-center space-x-3 text-xs text-gray-500">
                            <Badge variant="secondary" className="text-xs">
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                            <span>
                              {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {!notification.is_read && (
                          <Button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingAsRead === notification.id}
                            variant="ghost"
                            size="sm"
                            className="mt-3 self-end md:self-start text-xs md:text-sm md:ml-4 flex-shrink-0"
                          >
                            {markingAsRead === notification.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              "Mark as read"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;