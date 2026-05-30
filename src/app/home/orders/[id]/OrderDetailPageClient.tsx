"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getOrderDetails, Order, OrderItem, normalizeOrder } from "@/src/app/api/action";
import { checkoutService } from '@/src/api/services';
import { useAuthStore } from "@/src/store/authStore";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { formatCurrency } from "@/src/lib/utils";
import { Badge } from "@/src/ui/badge";
import { Skeleton } from "@/src/ui/skeleton";
import { ArrowLeft, Clock, MapPin, Package, Receipt, Truck, Phone } from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";

const OrderDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isUserAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.id as string;

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    if (!orderId) {
      setError("Order ID not provided");
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);

        // Auto-verify payment if returning from Paystack redirect
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        if (reference && !isBackground) {
          try {
            await checkoutService.verifyPayment({ reference, order_id: orderId } as any);
            // Small delay for backend side-effects
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            // Verification may fail or be redundant; continue to fetch order details
            console.warn('Payment verification attempt:', e);
          }
          // Clean URL params after verification attempt
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }

        const orderData = await getOrderDetails(orderId);
        // console.log(orderData);
        setOrder(orderData);
        setError(null);
      } catch (error: any) {
        console.error("Failed to fetch order details:", error);
        if (!isBackground) {
          setError(error.message || "Failed to fetch order details");
          showSimpleToast("Failed to load order details", "failed");
        }
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchOrderDetails();

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(() => {
      if (order && !['delivered', 'cancelled', 'completed'].includes(order.status)) {
        fetchOrderDetails(true);
      }
    }, 2000);

    // Listen for real-time updates
    const handleOrderUpdate = (event: any) => {
      const updatedOrderId = event.detail?.orderId;
      if (!updatedOrderId || updatedOrderId === orderId) {
        fetchOrderDetails(true);
      }
    };

    window.addEventListener('order:updated', handleOrderUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('order:updated', handleOrderUpdate);
    };
  }, [orderId, isUserAuthenticated, router, searchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "ready":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleTrackOrder = () => {
    router.push(`/home/tracking/${orderId}`);
  };

  // Render extras for an order item — handles both raw UUID dict and snapshot array formats
  const renderExtras = (extras: OrderItem["extras"]) => {
    if (!extras) return null;

    // Snapshot array format (e.g. from cart-based orders)
    if (Array.isArray(extras)) {
      if (extras.length === 0) return null;
      return (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Extras</p>
          {extras.map((e: any, i: number) => {
            const price = parseFloat(e.option_unit_price || "0");
            return (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-gray-600">
                  {e.extra_title}: <span className="font-medium text-gray-800">{e.option_name}</span>
                </span>
                {price > 0 && (
                  <span className="text-xs font-semibold text-orange ml-2">+₦{price.toLocaleString()}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Raw UUID-keyed dict format
    if (typeof extras === "object") {
      const active = Object.entries(extras).filter(([, val]) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "boolean") return val;
        if (typeof val === "number") return val > 0;
        return Boolean(val);
      });
      if (active.length === 0) return null;
      return (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 text-[11px] bg-orange/10 text-orange font-semibold px-2 py-0.5 rounded-full">
            {active.length} extra{active.length !== 1 ? "s" : ""} added
          </span>
        </div>
      );
    }

    return null;
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
          <h1 className="text-2xl font-bold">Order Details</h1>
        </div>

        <div className="hidden md:block md:px-16 mt-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="bg-background p-2 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold">Order Details</h1>
          </div>
        </div>

        <div className="px-3 md:px-16 space-y-6">
          <div className="bg-white rounded-lg p-6 border">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          <div className="bg-white rounded-lg p-6 border">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
        <MobileNavigation />
        <DesktopNavigation />

        <div className="flex items-center gap-4 mb-6 mt-4">
          <button
            onClick={() => router.back()}
            className="bg-background p-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Order Details</h1>
        </div>

        <div className="px-3 md:px-16">
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">Order not found</p>
            <p className="text-gray-500 mb-6">{error || "Unable to load order details"}</p>
            <button
              onClick={() => router.push("/home/orders")}
              className="bg-orange text-white px-6 py-2 rounded-lg hover:bg-orange/90 transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Order Details</h1>
            <p className="text-sm text-gray-600">#{order.order_number || order.id.slice(0, 8)}</p>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <DesktopNavigation />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Desktop Header */}
        <div className="hidden md:block mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full border"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Order Details</h1>
              <p className="text-gray-600">#{order.order_number || order.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Order Status Banner */}
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {order.outlet?.name || 'Restaurant'}
                </h2>
                <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
                  {String(order.status).charAt(0).toUpperCase() + String(order.status).slice(1).replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm md:text-base">
                Ordered on {formatDate(order.created_at)}
                {order.estimated_delivery_time && (
                  <span className="ml-4">
                    • Est. {order.fulfillment_mode === 'delivery' ? 'delivery' : 'pickup'}: {formatDate(order.estimated_delivery_time)}
                  </span>
                )}
              </p>
            </div>

            {(order.status === "placed" || order.status === "preparing" || order.status === "ready_pickup" || order.status === "ready_delivery" || order.status === "out_for_delivery") && (
              <button
                onClick={handleTrackOrder}
                className="bg-orange text-white px-6 py-3 rounded-xl font-medium hover:bg-orange/90 transition-colors whitespace-nowrap"
              >
                Track Order
              </button>
            )}
          </div>
        </div>

        {/* Pending Payment Actions */}
        {order.status === 'pending_payment' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-yellow-800 font-bold mb-1">Payment Required</h3>
              <p className="text-yellow-700 text-sm">Please complete payment to process your order.</p>
            </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {order.payment_ref && (
                  <button
                    onClick={async () => {
                      try {
                        const { checkoutService, ordersService } = await import('@/src/api/services');
                        showSimpleToast('Verifying payment...', 'info');
                        const res = await checkoutService.verifyPayment({
                          reference: order.payment_ref!,
                          order_id: order.id
                        });
                        if (res.status) {
                          showSimpleToast('Payment confirmed!', 'success');
                          // Refresh data
                          const updated = await ordersService.getOrder(params.id as string);
                          setOrder(normalizeOrder(updated));
                        } else {
                          showSimpleToast('Payment not yet verified', 'warning');
                        }
                      } catch (e) { 
                        console.error(e);
                        showSimpleToast('Verification failed', 'failed'); 
                      }
                    }}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                  >
                    Check Status
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm('Cancel this order?')) return;
                    try {
                      const { ordersService } = await import('@/src/api/services');
                      await ordersService.cancelOrder(order.id);
                      showSimpleToast('Order cancelled', 'success');
                      router.push('/home/orders');
                    } catch (e) { showSimpleToast('Failed to cancel', 'failed'); }
                  }}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { checkoutService } = await import('@/src/api/services');
                      const response = await checkoutService.initializePayment({
                        order_id: order.id,
                        callback_url: `${window.location.origin}/home/orders/${order.id}`,
                    });
                    if (response.authorization_url) window.location.href = response.authorization_url;
                  } catch (e) { showSimpleToast('Payment init failed', 'failed'); }
                }}
                className="flex-1 md:flex-none px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-md transition-all hover:shadow-lg"
              >
                Pay Now
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-4">Order Items</h3>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 last:pb-0 border-b border-gray-100 last:border-0">
                      <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl overflow-hidden">
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product?.title || `Item ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm md:text-base">{item.product?.title || `Item ${index + 1}`}</h4>
                        <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                        {item.size && (
                          <p className="text-xs text-gray-500 mt-0.5">Size: <span className="font-medium text-gray-700">{item.size}</span></p>
                        )}
                        {renderExtras(item.extras)}
                        {item.special_instructions && (
                          <p className="text-sm text-gray-500 italic mt-1 bg-gray-50 p-2 rounded-lg">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm md:text-base">₦{formatCurrency(Number(item.total_price))}</p>
                        <p className="text-xs md:text-sm text-gray-500">₦{formatCurrency(Number(item.unit_price))} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions (if any) */}
            {order.special_instructions && (
              <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-3">Special Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 italic">{order.special_instructions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary - Takes 1 column on large screens */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items ({order.items?.length || 0})</span>
                  <span>₦{formatCurrency(Number(order.subtotal || order.total_amount))}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>₦{formatCurrency(Number(order.delivery_fee))}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">VAT (7.5%)</span>
                  <span>₦{formatCurrency(Number(order.tax) || (Number(order.subtotal || order.total_amount) * 0.075))}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-orange">₦{formatCurrency(Number(order.total_amount))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant/Delivery Info */}
            {order.outlet && (
              <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {order.fulfillment_mode === 'delivery' ? (
                    <>
                      <Truck className="w-5 h-5 text-orange" />
                      <span>Delivery Details</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-green-600" />
                      <span>Pickup Details</span>
                    </>
                  )}
                </h3>
                <div className="space-y-4">
                  {/* Restaurant Name */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Restaurant</p>
                    <h4 className="font-bold text-gray-900 text-base">{order.outlet.name}</h4>
                  </div>

                  {/* Delivery Address or Pickup Location */}
                  {order.fulfillment_mode === 'delivery' && order.delivery_address ? (
                    <div className="bg-orange/5 border border-orange/20 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Delivering to</p>
                          <p className="text-gray-700 text-sm">{order.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  ) : order.outlet.address_text && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Pickup Location</p>
                          <p className="text-gray-700 text-sm">{order.outlet.address_text}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estimated Time */}
                  {order.estimated_delivery_time && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {order.fulfillment_mode === 'delivery' ? 'Estimated Delivery' : 'Ready for Pickup'}
                        </p>
                        <p className="text-gray-600 text-sm">{formatDate(order.estimated_delivery_time)}</p>
                      </div>
                    </div>
                  )}

                  {/* Order Placed Time */}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Order Placed</p>
                      <p className="text-gray-600 text-sm">{formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  {/* Customer Phone */}
                  {order.customer_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Contact</p>
                        <p className="text-gray-600 text-sm">{order.customer_phone}</p>
                      </div>
                    </div>
                  )}

                  {/* View Restaurant Button */}
                  {/* <div className="border-t pt-4 mt-4">
                    <button
                      onClick={() => router.push(`/home/outlets/${order.outlet.id}`)}
                      className="w-full bg-orange text-white px-4 py-3 rounded-lg font-medium hover:bg-orange/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      View Restaurant Details
                    </button>
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
