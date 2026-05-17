"use client";
import React, { useEffect, useState } from "react";
import { useOutletStore, type Outlet } from "../../../store/OutletStore";
import { useCartStore } from "@/src/store/CartStore";
import { getAllOutlets } from "../../api/action";
import { getSessionInfo } from "../../api/action";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/src/ui/skeleton";
import ErrorComponent from "@/src/components/home-components/ErrorComponent";

const Page = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOutlet, setExpandedOutlet] = useState<string | null>(null);
  const [selectingOutlet, setSelectingOutlet] = useState<string | null>(null);

  const { setSelectedOutlet } = useOutletStore();
  const { switchOutlet } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        setLoading(true);
        const data = await getAllOutlets();
        setOutlets(data);
      } catch (error: any) {
        setError(error.message || "An error occurred");
        console.error("Error fetching outlets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  const saveNewOutlet = async (outlet: Outlet) => {
    // Update selected outlet immediately for UI
    setSelectedOutlet(outlet);
    try {
      // Use cart store to persist/restore and initialize the outlet cart
      await switchOutlet(outlet.id);
    } catch (e) {
      console.warn('Failed to switch/init cart during outlet select:', e);
      try {
        // Best-effort: ensure cart is initialized
        const { initializeCartForOutlet } = useCartStore.getState();
        await initializeCartForOutlet(outlet.id);
      } catch (ie) {
        console.warn('Fallback initializeCartForOutlet failed:', ie);
      }
    }

    // console.log("Selected outlet:", outlet);
    router.push("/home");
  };

  const toggleExpand = (outletId: string) => {
    setExpandedOutlet(expandedOutlet === outletId ? null : outletId);
  };

  const getTodaysPickupHours = (outlet: Outlet) => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const today = days[new Date().getDay()];
    return outlet.pickup_hours[today];
  };

  if (loading) {
    return (
      <div>
        <div className="bg-black text-white p-3 flex flex-col justify-center items-center">
          <p className="text-2xl">Select an outlet</p>
        </div>
        <div className="flex flex-col justify-center items-center mt-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item}>
              <Skeleton className="h-[250px] md:h-[200px] w-[330px] md:w-[500px] rounded-xl mb-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return (
    <div className="w-full">
      <div className="bg-black text-white p-3 flex flex-col justify-center items-center">
        <p className="text-2xl flex flex-col items-center gap-1">
          Select an outlet
          <span className="text-xs font-normal text-gray-300 md:hidden animate-pulse">↓ Scroll for more outlets ↓</span>
        </p>
      </div>

      <div className="flex flex-col justify-center items-center gap-3 md:gap-4 mt-4 pb-32 px-2 md:px-0">
        {outlets.map((outlet) => {
          const todaysHours = getTodaysPickupHours(outlet);
          const isExpanded = expandedOutlet === outlet.id;

          return (
            <div
              className="w-full md:w-[50%] shadow-sm md:shadow-md p-3 md:p-4 rounded-lg border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow bg-white"
              key={outlet.id}
              onClick={() => toggleExpand(outlet.id)}
            >
              {/* Minimal Details - Always Visible */}
              <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between items-start md:items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-lg md:text-2xl font-semibold text-gray-800 truncate pr-2">
                    {outlet.name}
                  </p>
                  <p className="text-gray-600 text-xs md:text-sm mt-0.5 line-clamp-1">
                    {outlet.address_text}
                  </p>
                </div>
                <button
                  className="px-4 py-1.5 md:px-6 md:py-2 bg-black text-white text-sm md:text-lg rounded-sm cursor-pointer hover:bg-gray-800 transition-colors w-full md:w-auto mt-2 md:mt-0 font-medium shrink-0"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card expand when clicking select
                    saveNewOutlet(outlet);
                  }}
                >
                  Select
                </button>
              </div>

              {/* Always visible basic info */}
              <div className="mt-2 text-xs md:text-base grid grid-cols-2 gap-2">
                <p className="text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                  {todaysHours
                    ? `Open until ${todaysHours.close}`
                    : "Closed today"}
                </p>
                <p className="text-gray-500 text-right md:text-left">
                  {todaysHours
                    ? `${todaysHours.prep_time_mins} min prep`
                    : "-"}
                </p>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 animate-fadeIn">
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-700 font-medium">Contact</p>
                      <p className="text-gray-600">{outlet.phone}</p>
                    </div>

                    <div>
                      <p className="text-gray-700 font-medium">
                        Delivery Information
                      </p>
                      <p className="text-gray-600">
                        Fee: ₦{parseFloat(outlet.delivery_fee).toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        Radius: {outlet.delivery_radius_km} km
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-700 font-medium">
                        Services Available
                      </p>
                      <div className="flex gap-4 mt-1">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            outlet.is_pickup_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Pickup{" "}
                          {outlet.is_pickup_active
                            ? "Available"
                            : "Unavailable"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            outlet.is_delivery_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Delivery{" "}
                          {outlet.is_delivery_active
                            ? "Available"
                            : "Unavailable"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-700 font-medium">Pickup Hours</p>
                      <div className="text-gray-600 text-sm">
                        {Object.entries(outlet.pickup_hours).map(
                          ([day, hours]) => (
                            <div key={day} className="flex justify-between">
                              <span className="capitalize">{day}:</span>
                              <span>
                                {hours.open} - {hours.close}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expand/Collapse Indicator */}
              <div className="flex justify-center mt-3">
                <button
                  className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(outlet.id);
                  }}
                >
                  {isExpanded ? "Show Less" : "Show More"}
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Page;
