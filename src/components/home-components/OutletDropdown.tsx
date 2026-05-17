"use client";

import { useState, useEffect } from "react";
import { useOutletStore, type Outlet } from "@/src/store/OutletStore";
import { useCartStore } from "@/src/store/CartStore";
import { getAllOutlets } from "@/src/app/api/action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/ui/dropdown-menu";
import { MapPin, ChevronDown, Phone, Truck } from "lucide-react";
import { formatCurrency } from "@/src/lib/utils";

export default function OutletDropdown() {
  const { selectedOutlet, setSelectedOutlet } = useOutletStore();
  const { initializeCartForOutlet, clearCart, switchOutlet } = useCartStore();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const data = await getAllOutlets();
        setOutlets(data);
      } catch (error) {
        console.error("Failed to fetch outlets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutlets();
  }, []);

  // If outlets load and there's no selected outlet (AuthInit may have failed),
  // pick the first outlet as a safe default so the page isn't blank.
  useEffect(() => {
    const tryAutoSelect = async () => {
      if (!selectedOutlet && outlets && outlets.length > 0) {
        try {
          const first = outlets[0];
          setSelectedOutlet(first as any);
          await initializeCartForOutlet(first.id);
        } catch (e) {
          console.warn("OutletDropdown: auto-select failed", e);
        }
      }
    };

    tryAutoSelect();
  }, [outlets, selectedOutlet, setSelectedOutlet, initializeCartForOutlet]);

  // Initialize cart when component mounts if there's already a selected outlet
  useEffect(() => {
    const initializeExistingOutlet = async () => {
      if (selectedOutlet?.id) {
        try {
          // console.log("🏪 Initializing cart for existing outlet:", selectedOutlet.name);
          await initializeCartForOutlet(selectedOutlet.id);
        } catch (error) {
          console.error(
            "❌ Failed to initialize cart for existing outlet:",
            error
          );
        }
      }
    };

    initializeExistingOutlet();
  }, [selectedOutlet?.id, initializeCartForOutlet]);

  const handleOutletSelect = async (outlet: Outlet) => {
    // If switching to a different outlet, use the centralized switchOutlet
    // routine which persists/restores per-outlet carts and initializes
    // the selected outlet in the background.
    try {
      if (selectedOutlet?.id && selectedOutlet.id === outlet.id) {
        // No-op if selecting the same outlet
        setSelectedOutlet(outlet);
        return;
      }

      // console.log("🔄 Switching outlets via switchOutlet to:", outlet.id);
      // Update the selected outlet in the outlet store immediately for UI
      setSelectedOutlet(outlet);

      // Let the cart store handle persistence/restore and initialization
      await switchOutlet(outlet.id);
    } catch (error) {
      console.error("❌ Failed to switch/init cart for outlet:", error);
      // Fallback: still set selected outlet and attempt basic init
      setSelectedOutlet(outlet);
      try {
        await initializeCartForOutlet(outlet.id);
      } catch (e) {
        console.error("❌ Fallback initialize failed:", e);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Outlet Selection */}
      <DropdownMenu>
        <DropdownMenuTrigger className="md:hidden mt-8 flex gap-3 items-center outline-none bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200">
          <MapPin className="h-5 w-5 text-black" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900">
              {selectedOutlet ? selectedOutlet.name : "Select Outlet"}
            </p>
            {selectedOutlet && (
              <p className="text-xs text-gray-500 truncate">
                {selectedOutlet.address_text}
              </p>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 p-2">
          {isLoading ? (
            <DropdownMenuItem disabled className="text-center py-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Loading outlets...
              </div>
            </DropdownMenuItem>
          ) : outlets.length === 0 ? (
            <DropdownMenuItem
              disabled
              className="text-center py-4 text-gray-500"
            >
              No outlets available
            </DropdownMenuItem>
          ) : (
            outlets.map((outlet) => (
              <DropdownMenuItem
                key={outlet.id}
                onClick={() => handleOutletSelect(outlet)}
                className={`cursor-pointer rounded-lg p-3 mb-1 transition-colors duration-200 ${
                  selectedOutlet?.id === outlet.id
                    ? "bg-white border border-black"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  <MapPin
                    className={`h-4 w-4 mt-1 flex-shrink-0 ${
                      selectedOutlet?.id === outlet.id
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        selectedOutlet?.id === outlet.id
                          ? "text-black"
                          : "text-gray-900"
                      }`}
                    >
                      {outlet.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {outlet.address_text}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {outlet.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          ₦{formatCurrency(outlet.delivery_fee)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedOutlet?.id === outlet.id && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-black rounded-full"></div>
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Desktop Outlet Selection - Header with Dropdown */}
      <div className="hidden md:block md:px-16 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-black/20 p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Select Outlet
                </h3>
                <p className="text-sm text-gray-600">
                  Choose your preferred location for delivery
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex gap-3 items-center outline-none bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                <MapPin className="h-5 w-5 text-black" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedOutlet ? selectedOutlet.name : "Select Outlet"}
                  </p>
                  {selectedOutlet && (
                    <p className="text-xs text-gray-500 truncate">
                      {selectedOutlet.address_text}
                    </p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-2">
                {isLoading ? (
                  <DropdownMenuItem disabled className="text-center py-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Loading outlets...
                    </div>
                  </DropdownMenuItem>
                ) : outlets.length === 0 ? (
                  <DropdownMenuItem
                    disabled
                    className="text-center py-4 text-gray-500"
                  >
                    No outlets available
                  </DropdownMenuItem>
                ) : (
                  outlets.map((outlet) => (
                    <DropdownMenuItem
                      key={outlet.id}
                      onClick={() => handleOutletSelect(outlet)}
                      className={`cursor-pointer rounded-lg p-3 mb-1 transition-colors duration-200 ${
                        selectedOutlet?.id === outlet.id
                          ? "bg-white border border-black"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <MapPin
                          className={`h-4 w-4 mt-1 flex-shrink-0 ${
                            selectedOutlet?.id === outlet.id
                              ? "text-black"
                              : "text-gray-400"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              selectedOutlet?.id === outlet.id
                                ? "text-black"
                                : "text-gray-900"
                            }`}
                          >
                            {outlet.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {outlet.address_text}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {outlet.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                ₦{formatCurrency(outlet.delivery_fee)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedOutlet?.id === outlet.id && (
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-black rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
