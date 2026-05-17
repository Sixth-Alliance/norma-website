"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logger, initGlobalLogger } from '@/src/utils/logger';
import { getUserOrders, Order, OrdersResponse } from "@/src/app/api/action";
import { checkoutService } from '@/src/api/services';
import { useAuthStore } from "@/src/store/authStore";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { Badge } from "@/src/ui/badge";
import { Skeleton } from "@/src/ui/skeleton";
import { ArrowLeft, Clock, MapPin, Package, Receipt } from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";

const OrdersPage = () => {
  const router = useRouter();
  const { isUserAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ongoing" | "history">("ongoing");

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    const completedStatuses = ['completed', 'delivered', 'cancelled', 'failed'];
    if (activeTab === "ongoing") {
      return !completedStatuses.includes(order.status);
    } else {
      return completedStatuses.includes(order.status);
    }
  });

  useEffect(() => {
    try { initGlobalLogger(); logger.info('Logger initialized on orders page'); } catch (e) { }
    if (!isUserAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data: OrdersResponse = await getUserOrders(1, undefined); // Fetch all orders
        setOrders(data.results || []);
        setError(null);
      } catch (error: any) {
        logger.error("Failed to fetch orders:", error);
        setError(error.message || "Failed to fetch orders");
        showSimpleToast("Failed to load orders", "failed");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    // Listen for order updates (e.g., payment completed) to refresh list
    const onOrderUpdated = (e: any) => {
      try {
        fetchOrders();
      } catch (err) { }
    };
    window.addEventListener('order:updated', onOrderUpdated as EventListener);

    // Listen for cross-tab storage changes (e.g., payment redirect marker)
    const handleStorage = (evt: StorageEvent) => {
      try {
        if (!evt.key) return;
        if (evt.key === 'pending_order_payment') {
          // Re-fetch orders when a payment flow marker is set/updated or removed
          fetchOrders();
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage as EventListener);

    // On mount, check if there's a pending marker (user returned from payment)
    try {
      const marker = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('pending_order_payment') : null;
      if (marker) {
        // Try to parse marker and attempt immediate server-side verification when possible
        (async () => {
          try {
            const parsed = JSON.parse(marker || "{}") as { orderId?: string; ts?: number };
            const orderId = parsed?.orderId;

            // Try to read reference from query params (Paystack typically returns ?reference=...)
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const params = new URLSearchParams(search || '');
            const reference = params.get('reference') || params.get('trxref') || params.get('transaction_reference');

            if (reference && orderId) {
              // Fire a verify request to speed up order status update (backend will also process webhook)
              try {
                // call checkoutService.verifyPayment directly with both reference and order_id
                await checkoutService.verifyPayment({ reference, order_id: orderId } as any);
                // small delay to allow backend to process side-effects
                setTimeout(() => fetchOrders(), 700);
              } catch (e) {
                // verification may fail or be redundant; fall back to re-fetching orders after a delay
                setTimeout(() => fetchOrders(), 1500);
              }
            } else {
              // No reference available yet; wait briefly then re-fetch orders (webhook may update backend)
              setTimeout(() => fetchOrders(), 1500);
            }
          } catch (e) {
            // If parsing or verification fails, just re-fetch orders after a short delay
            setTimeout(() => fetchOrders(), 1500);
          }
        })();

        try { window.localStorage.removeItem('pending_order_payment'); } catch (e) { }
      }
    } catch (e) {
      // ignore
    }

    return () => {
      window.removeEventListener('order:updated', onOrderUpdated as EventListener);
      window.removeEventListener('storage', handleStorage as EventListener);
    };
  }, [isUserAuthenticated, router]); // Removed selectedStatus dependency

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment":
        return "bg-yellow-100 text-yellow-800";
      case "placed":
      case "paid":
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "ready_pickup":
      case "ready_delivery":
        return "bg-purple-100 text-purple-800";
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-800";
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_payment":
        return "Pending Payment";
      case "placed":
        return "Order Placed";
      case "paid":
        return "Paid";
      case "confirmed":
        return "Confirmed";
      case "preparing":
        return "Preparing";
      case "ready_pickup":
        return "Ready for Pickup";
      case "ready_delivery":
        return "Ready for Delivery";
      case "out_for_delivery":
        return "Out for Delivery";
      case "completed":
        return "Completed";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      case "failed":
        return "Failed";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/home/orders/${orderId}`);
  };

  const handleTrackOrder = (orderId: string) => {
    router.push(`/home/tracking/${orderId}`);
  };

  if (loading) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
        <MobileNavigation />
        <DesktopNavigation />

        <div className="md:hidden flex items-center gap-4 mb-6 mt-4">
          <button
            onClick={() => router.back()}
            className="bg-background p-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">My Orders</h1>
        </div>

        <div className="hidden md:block md:px-16 mt-8">
          <h1 className="text-3xl font-bold mb-6">My Orders</h1>
        </div>

        <div className="px-3 md:px-16 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 border">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-6 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
      <MobileNavigation />
      <DesktopNavigation />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-4 mb-6 mt-4">
        <button
          onClick={() => router.back()}
          className="bg-background p-2 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">My Orders</h1>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block md:px-16 mt-8">
        <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      </div>

      {/* Tab Navigation */}
      <div className="px-3 md:px-16 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "ongoing"
              ? "bg-white text-orange shadow-sm"
              : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Ongoing Orders
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "history"
              ? "bg-white text-orange shadow-sm"
              : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Order History
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-3 md:px-16">
        {error ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">Failed to load orders</p>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange text-white px-6 py-2 rounded-lg hover:bg-orange/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">No orders found</p>
            <p className="text-gray-500 mb-6">
              {activeTab === "ongoing"
                ? "You don't have any ongoing orders."
                : "You don't have any completed orders yet."}
            </p>
            <button
              onClick={() => router.push("/home")}
              className="bg-orange text-white px-6 py-2 rounded-lg hover:bg-orange/90 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg p-4 md:p-6 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOrderClick(order.id)}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                {/* Order Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>{order.outlet?.name || 'Outlet'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Receipt className="w-4 h-4" />
                    <span>
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      • ₦{order.total_amount?.toLocaleString() || '0'}
                    </span>
                  </div>
                  {order.delivery_address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{order.delivery_address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Est. delivery: {order.estimated_delivery_time}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-3 mb-4">
                  <div className="space-y-1">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product?.title || 'Item'}</span>
                        <span>₦{parseFloat(item.total_price || '0').toLocaleString()}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-sm text-gray-500">
                        +{order.items.length - 2} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Total and Actions */}
                <div className="flex flex-wrap gap-3 justify-between items-center border-t pt-3">
                  <div>
                    <p className="font-bold text-lg">
                      ₦{order.total_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {/* Pay Now & Cancel for Pending Orders */}
                    {order.status === "pending_payment" && (
                      <>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Initialize payment directly
                              const response = await checkoutService.initializePayment({
                                order_id: order.id,
                                callback_url: `${window.location.origin}/home/orders/${order.id}`,
                              });

                              if (response.authorization_url) {
                                window.location.href = response.authorization_url;
                              } else {
                                showSimpleToast("Failed to initialize payment", "failed");
                              }
                            } catch (error) {
                              logger.error("Pay Now failed:", error);
                              showSimpleToast("Failed to start payment", "failed");
                            }
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          Pay Now
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm("Are you sure you want to cancel this order?")) return;
                            try {
                              // Dynamic import to avoid circular dependencies if any, 
                              // though ordersService is safe to use here
                              const { ordersService } = await import('@/src/api/services');
                              await ordersService.cancelOrder(order.id);
                              showSimpleToast("Order cancelled", "success");
                              // Refresh list
                              const event = new CustomEvent('order:updated');
                              window.dispatchEvent(event);
                            } catch (error) {
                              logger.error("Cancel failed:", error);
                              showSimpleToast("Failed to cancel order", "failed");
                            }
                          }}
                          className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition-colors"
                        >
                          Cancel Order
                        </button>
                      </>
                    )}

                    {/* Track Order for Active Orders */}
                    {(order.status === "placed" || order.status === "paid" || order.status === "confirmed" || order.status === "preparing" || order.status === "ready_pickup" || order.status === "ready_delivery" || order.status === "out_for_delivery") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackOrder(order.id);
                        }}
                        className="bg-orange text-white px-4 py-2 rounded-lg text-sm hover:bg-orange/90 transition-colors"
                      >
                        Track Order
                      </button>
                    )}

                    {/* Buy Again for History */}
                    {(order.status === "completed" || order.status === "delivered" || order.status === "cancelled" || order.status === "failed") && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { ordersService } = await import('@/src/api/services');
                            // Dynamic import to avoid circular dependency issues
                            const { useCartStore } = await import('@/src/store/CartStore');
                            const { setCartToken } = await import('@/src/lib/tokens');
                            const { setCartId } = await import('@/src/lib/cartPersistence');

                            const response = await ordersService.reorder(order.id);

                            if (response.cart) {
                              // 1. Force update local tokens immediately
                              if (response.cart.cart_token) {
                                setCartToken(response.cart.cart_token);
                                window.localStorage.setItem('cart_token', response.cart.cart_token);
                              }
                              if (response.cart.id) {
                                setCartId(response.cart.id);
                              }

                              // 2. Force CartStore to invalidate and fetch the new cart state
                              // We use the outlet from reorder or fallback to order's outlet
                              const outletId = response.cart.outlet_id || (typeof order.outlet === 'string' ? order.outlet : order.outlet?.id);
                              if (outletId) {
                                // ⚡ CRITICAL: Invalidate the cached cart response so we don't get a stale empty cart
                                const { apiClient } = await import('@/src/api/client');
                                apiClient.invalidateCache(`cart_${outletId}`);
                                
                                await useCartStore.getState().reSyncCartWithBackend(outletId);
                              }
                            }

                            if (response.warnings && response.warnings.length > 0) {
                              showSimpleToast(`Cart created with ${response.warnings.length} alerts`, "info");
                            } else {
                              showSimpleToast("Items added to cart", "success");
                            }
                            router.push('/home/cart');
                          } catch (error: any) {
                            logger.error("Reorder failed:", error);
                            // Show specific message from backend if available (e.g. "Items out of stock")
                            const msg = error?.message || "Failed to reorder items";
                            showSimpleToast(msg, "failed");
                          }
                        }}
                        className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                      >
                        Buy Again
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order.id);
                      }}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;