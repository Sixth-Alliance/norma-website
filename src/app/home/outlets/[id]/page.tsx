"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/src/store/authStore";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { ArrowLeft, MapPin, Clock, Phone, Mail } from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { outletsService } from "@/src/api/services";
import * as API from "@/src/types/api";

const OutletDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const { isUserAuthenticated } = useAuthStore();
  
  const [outlet, setOutlet] = useState<API.Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  const outletId = params.id as string;

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    // Fetch outlet details from API
    const fetchOutletDetails = async () => {
      try {
        setLoading(true);
        const data = await outletsService.getOutlet(outletId);
        setOutlet(data);
      } catch (error) {
        console.error("Failed to fetch outlet details:", error);
        showSimpleToast("Failed to load outlet details", "failed");
        // Redirect to outlets list on error
        router.push("/home/outlets");
      } finally {
        setLoading(false);
      }
    };

    fetchOutletDetails();
  }, [outletId, isUserAuthenticated, router]);

  const openInMaps = () => {
    if (!outlet) return;
    
    try {
      let query = outlet.address_text || outlet.address || outlet.name || '';
      if (outlet.latitude && outlet.longitude) {
        query = `${outlet.latitude},${outlet.longitude}`;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      window.open(url, '_blank');
    } catch (e) {
      showSimpleToast("Failed to open maps", "failed");
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
        <MobileNavigation />
        <DesktopNavigation />
        
        <div className="max-w-4xl mx-auto mt-6 md:mt-8 p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
        <MobileNavigation />
        <DesktopNavigation />
        
        <div className="max-w-4xl mx-auto mt-6 md:mt-8 p-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Outlet not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-orange hover:underline"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-0 bg-background-dark md:bg-background min-h-screen">
      <MobileNavigation />
      <DesktopNavigation />
      
      <div className="max-w-4xl mx-auto mt-6 md:mt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border md:border-none md:shadow-none md:bg-transparent md:p-0">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {outlet.name}
            </h1>
            <p className="text-sm text-gray-500">Restaurant Details</p>
          </div>
        </div>

        {/* Map Section */}
        {(outlet.latitude && outlet.longitude) && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="h-64 md:h-96 bg-gray-100 relative">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${outlet.latitude},${outlet.longitude}`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* Details Section */}
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-6">
          {/* Address */}
          {(outlet.address_text || outlet.address) && (
            <div className="flex items-start gap-4 pb-6 border-b">
              <div className="flex-shrink-0 w-10 h-10 bg-orange/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                <p className="text-gray-600">{outlet.address_text || outlet.address}</p>
                <button
                  onClick={openInMaps}
                  className="mt-3 text-orange font-medium text-sm hover:underline inline-flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Google Maps
                </button>
              </div>
            </div>
          )}

          {/* Phone */}
          {outlet.phone && (
            <div className="flex items-start gap-4 pb-6 border-b">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                <a
                  href={`tel:${outlet.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {outlet.phone}
                </a>
              </div>
            </div>
          )}

          {/* Delivery & Pickup Hours */}
          {(outlet.delivery_hours || outlet.pickup_hours || outlet.opening_hours) && (
            <div className="flex items-start gap-4 pb-6 border-b">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Hours</h3>
                
                {/* Delivery Hours */}
                {outlet.delivery_hours && Object.keys(outlet.delivery_hours).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Delivery Hours</p>
                    <div className="space-y-1">
                      {Object.entries(outlet.delivery_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="capitalize text-gray-600">{day}</span>
                          <span className="text-gray-900">{hours.open} - {hours.close}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Pickup Hours */}
                {outlet.pickup_hours && Object.keys(outlet.pickup_hours).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Pickup Hours</p>
                    <div className="space-y-1">
                      {Object.entries(outlet.pickup_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="capitalize text-gray-600">{day}</span>
                          <span className="text-gray-900">{hours.open} - {hours.close}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Legacy Opening Hours */}
                {outlet.opening_hours && !outlet.delivery_hours && !outlet.pickup_hours && Object.keys(outlet.opening_hours).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(outlet.opening_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600">{day}</span>
                        <span className="text-gray-900">{hours.open} - {hours.close}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Current Status */}
                <div className="mt-3 pt-3 border-t space-y-1">
                  {outlet.is_currently_open_delivery !== undefined && (
                    <p className="text-sm">
                      <span className="text-gray-600">Delivery: </span>
                      <span className={outlet.is_currently_open_delivery ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {outlet.is_currently_open_delivery ? "Open Now" : "Closed"}
                      </span>
                    </p>
                  )}
                  {outlet.is_currently_open_pickup !== undefined && (
                    <p className="text-sm">
                      <span className="text-gray-600">Pickup: </span>
                      <span className={outlet.is_currently_open_pickup ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {outlet.is_currently_open_pickup ? "Open Now" : "Closed"}
                      </span>
                    </p>
                  )}
                  {outlet.estimated_delivery_time && (
                    <p className="text-sm">
                      <span className="text-gray-600">Est. Delivery: </span>
                      <span className="text-gray-900 font-medium">{outlet.estimated_delivery_time}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}          {/* Description */}
          {outlet.description && (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">{outlet.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={openInMaps}
            className="flex-1 bg-orange text-white px-6 py-3 rounded-lg font-medium hover:bg-orange/90 transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            Get Directions
          </button>
          
          {outlet.phone && (
            <a
              href={`tel:${outlet.phone}`}
              className="flex-1 bg-white text-gray-900 border-2 border-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutletDetailPage;
