"use client";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import BikeIcon from "@/src/assets/images/bike.svg";
import TimerIcon from "@/src/assets/images/time-02.svg";
import MapIcon from "@/src/assets/images/maps-location-01.svg";
import PackageIcon from "@/src/assets/images/package-receive.svg";
import { ArrowLeft, Copy, Check, Clock, MapPin, Navigation, Phone, ChevronRight, Truck, Package } from "lucide-react";
import { formatCurrency } from "@/src/lib/utils";
import { useRouter } from "next/navigation";
import { logger, initGlobalLogger } from '@/src/utils/logger';
import { useParams, useSearchParams } from "next/navigation";
import { getOrderDetails, Order } from "@/src/app/api/action";
import { checkoutService } from '@/src/api/services';
import { useAuthStore } from "@/src/store/authStore";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { Skeleton } from "@/src/ui/skeleton";

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isUserAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.id as string;

  useEffect(() => {
    try { initGlobalLogger(); logger.info('Logger initialized on tracking page'); } catch (e) { }
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
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            logger.warn('Payment verification attempt:', e);
          }
          // Clean URL params after verification attempt
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }

        const orderData = await getOrderDetails(orderId);
        setOrder(orderData);
        setError(null);
        // Notify other parts of the app that the order may have been updated
        try {
          if (typeof window !== 'undefined' && !isBackground) {
            window.dispatchEvent(new CustomEvent('order:updated', { detail: { orderId } }));
            // Clear any pending marker set before redirecting to hosted payment
            try { window.localStorage.removeItem('pending_order_payment'); } catch (e) { }
          }
        } catch (e) {
          logger.debug('Failed to dispatch order:updated event', e);
        }
      } catch (error: any) {
        logger.error("Failed to fetch order details:", error);
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
      if (order && !['delivered', 'cancelled', 'completed', 'failed'].includes(order.status)) {
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

  const getTrackingSteps = (fulfillmentMode: string, currentStatus: string) => {
    // Define different tracking flows for delivery vs pickup
    if (fulfillmentMode === 'delivery') {
      return [
        {
          id: 'placed',
          title: currentStatus === 'pending_payment' ? 'Payment Pending' : 'Order Placed',
          description: currentStatus === 'pending_payment' ? 'Waiting for payment confirmation.' : 'We have received your order.',
          icon: currentStatus === 'pending_payment' ? '💳' : '🍽️',
          // Show active for standard placed statuses + new confirmed/paid intermediate statuses
          isActive: ['pending_payment', 'placed', 'paid', 'confirmed', 'preparing', 'ready_delivery', 'out_for_delivery', 'completed', 'delivered'].includes(currentStatus),
          isCompleted: ['placed', 'paid', 'confirmed', 'preparing', 'ready_delivery', 'out_for_delivery', 'completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'preparing',
          title: 'Order Being Prepared',
          description: 'Your order is being prepared by the kitchen.',
          icon: '👨‍🍳',
          isActive: ['preparing', 'ready_delivery', 'out_for_delivery', 'completed', 'delivered'].includes(currentStatus),
          // ready_delivery implies preparation is done
          isCompleted: ['preparing', 'ready_delivery', 'out_for_delivery', 'completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'out_for_delivery',
          title: 'Out for Delivery',
          description: 'Delivery agent has picked up your order.',
          icon: '🛵',
          isActive: ['out_for_delivery', 'completed', 'delivered'].includes(currentStatus),
          isCompleted: ['completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'completed',
          title: 'Order Delivered',
          description: 'Your order has been delivered.',
          icon: '✅',
          isActive: ['completed', 'delivered'].includes(currentStatus),
          isCompleted: ['completed', 'delivered'].includes(currentStatus)
        }
      ];
    } else {
      // Pickup flow
      return [
        {
          id: 'placed',
          title: currentStatus === 'pending_payment' ? 'Payment Pending' : 'Order Placed',
          description: currentStatus === 'pending_payment' ? 'Waiting for payment confirmation.' : 'We have received your order.',
          icon: currentStatus === 'pending_payment' ? '💳' : '🍽️',
          isActive: ['pending_payment', 'placed', 'paid', 'confirmed', 'preparing', 'ready_pickup', 'completed', 'delivered'].includes(currentStatus),
          isCompleted: ['placed', 'paid', 'confirmed', 'preparing', 'ready_pickup', 'completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'preparing',
          title: 'Order Being Prepared',
          description: 'Your order is being prepared by the kitchen.',
          icon: '👨‍🍳',
          isActive: ['preparing', 'ready_pickup', 'completed', 'delivered'].includes(currentStatus),
          isCompleted: ['preparing', 'ready_pickup', 'completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'ready_pickup',
          title: 'Ready for Pickup',
          description: 'Your order is ready for pickup.',
          icon: '📦',
          isActive: ['ready_pickup', 'completed', 'delivered'].includes(currentStatus),
          isCompleted: ['completed', 'delivered'].includes(currentStatus)
        },
        {
          id: 'completed',
          title: 'Order Completed',
          description: 'Your order has been picked up.',
          icon: '✅',
          isActive: ['completed', 'delivered'].includes(currentStatus),
          isCompleted: ['completed', 'delivered'].includes(currentStatus)
        }
      ];
    }
  };

  const getEstimatedTime = (status: string, fulfillmentMode: string) => {
    const timeEstimates: { [key: string]: string } = {
      'pending_payment': '5 minutes',
      'placed': fulfillmentMode === 'delivery' ? '30-45 minutes' : '20-30 minutes',
      'paid': fulfillmentMode === 'delivery' ? '30-45 minutes' : '20-30 minutes',
      'confirmed': fulfillmentMode === 'delivery' ? '30-45 minutes' : '20-30 minutes',
      'preparing': fulfillmentMode === 'delivery' ? '15-25 minutes' : '10-20 minutes',
      'ready_pickup': '0 minutes - Ready now!',
      'ready_delivery': '5-10 minutes',
      'out_for_delivery': '10-15 minutes',
      'completed': 'Delivered!',
      'delivered': 'Delivered!',
      'failed': 'Order Failed',
      'cancelled': 'Order Cancelled'
    };
    return timeEstimates[status] || '30 minutes';
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

  if (loading) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background-dark min-h-screen">
        <div className="md:hidden">
          <div className="flex items-center gap-12">
            <span
              className="bg-background p-2 rounded-full"
              onClick={() => router.push("/home/orders")}
            >
              <ArrowLeft />
            </span>
            <p className="text-2xl font-semibold">Track your Order</p>
          </div>
        </div>
        <DesktopNavigation />

        <div className="flex flex-col justify-center items-center mt-10">
          <Skeleton className="w-[156px] h-[156px] md:w-[200px] md:h-[200px] rounded-full" />
          <Skeleton className="h-8 w-64 my-5" />

          <div className="md:bg-background p-3 md:p-5 md:w-[40%] flex flex-col gap-3 rounded-lg my-5 md:my-0 border border-[#EAEAEA] md:border-0 w-full">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background-dark min-h-screen">
        <div className="md:hidden">
          <div className="flex items-center gap-12">
            <span
              className="bg-background p-2 rounded-full"
              onClick={() => router.push("/home/orders")}
            >
              <ArrowLeft />
            </span>
            <p className="text-2xl font-semibold">Track your Order</p>
          </div>
        </div>
        <DesktopNavigation />

        <div className="flex flex-col justify-center items-center mt-10">
          <div className="text-center py-12">
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
  const trackingSteps = getTrackingSteps(order?.fulfillment_mode || 'delivery', order?.status || 'placed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.push("/home/orders")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Track your Order</h1>
        </div>
      </div>

      {/* Desktop Navigation */}
      <DesktopNavigation />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-orange-100 rounded-full mb-6">
            <div className="text-4xl md:text-5xl">🛵</div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Track your Order
          </h1>
          <p className="text-gray-600">
            Order #{order.order_number || order.id.slice(0, 8)}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Estimated delivery time</span>
              <p className="font-medium text-gray-900">
                {getEstimatedTime(order.status, order.fulfillment_mode || 'delivery')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Order ID</span>
              <p className="font-medium text-gray-900">
                ID #{order.id.slice(0, 6)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Payment Actions */}
        {order.status === 'pending_payment' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-yellow-800 font-semibold mb-1">Payment Required</h3>
              <p className="text-yellow-700 text-sm">Please complete payment to process your order.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
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

        {/* Progress Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="relative">
            {trackingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center mb-8 last:mb-0">
                {/* Step Icon */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${step.isCompleted
                  ? 'bg-orange text-white border-orange'
                  : step.isActive
                    ? 'bg-orange-50 text-orange border-orange'
                    : 'bg-gray-100 text-gray-400 border-gray-300'
                  }`}>
                  <span className="text-xl">{step.icon}</span>
                </div>

                {/* Connecting Line */}
                {index < trackingSteps.length - 1 && (
                  <div className={`absolute left-6 top-12 w-0.5 h-16 ${step.isCompleted ? 'bg-orange' : 'bg-gray-300'
                    }`} />
                )}

                {/* Step Content */}
                <div className="ml-4 flex-1">
                  <h3 className={`font-semibold ${step.isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm mt-1 ${step.isActive ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                    {step.description}
                  </p>
                  {step.isActive && !step.isCompleted && (
                    <div className="mt-2">
                      <span className="inline-flex items-center text-xs font-medium text-orange bg-orange-50 px-2 py-1 rounded-full">
                        Current Status
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Items ({order.items.length})</h3>
              <div className="space-y-3">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{item.product?.title || 'Item'}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium">₦{formatCurrency(Number(item.total_price))}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-sm text-gray-500">+{order.items.length - 3} more items</p>
                )}
              </div>
              
              {/* Price Breakdown */}
              <div className="pt-3 mt-3 border-t space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₦{formatCurrency(Number(order.subtotal || order.total_amount))}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>₦{formatCurrency(Number(order.delivery_fee))}</span>
                </div>

                {/* <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">VAT (7.5%)</span>
                  <span>₦{formatCurrency(Number(order.tax) || (Number(order.subtotal || order.total_amount) * 0.075))}</span>
                </div> */}

                <div className="flex justify-between items-center font-bold text-base pt-2 border-t mt-2">
                  <span>Total</span>
                  <span className="text-orange">₦{formatCurrency(Number(order.total_amount))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Restaurant Info */}
          {order.outlet && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">Restaurant</h3>
              <div className="space-y-2">
                <p className="font-medium">{order.outlet.name}</p>
                {order.outlet.address_text && (
                  <p className="text-sm text-gray-600">{order.outlet.address_text}</p>
                )}
                {order.delivery_address && order.fulfillment_mode === 'delivery' && (
                  <div className="pt-3 mt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address</p>
                    <p className="text-sm text-gray-600">{order.delivery_address}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
