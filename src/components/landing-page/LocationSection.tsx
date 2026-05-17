"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LeftImage from "@/src/assets/images/0-36.jpg";
import { getAllOutlets } from "@/src/app/api/action";
import { useOutletStore, type Outlet } from "@/src/store/OutletStore";
import { useCartStore } from "@/src/store/CartStore";
import { logger } from "@/src/utils/logger";

const LocationSection = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOutlets, setLoadingOutlets] = useState<Set<string>>(new Set());
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
        logger.error("Error fetching outlets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  const saveNewOutlet = async (outlet: Outlet) => {
    // Add outlet to loading set
    setLoadingOutlets((prev) => new Set(prev).add(outlet.id));

    try {
      setSelectedOutlet(outlet);
      try {
        await switchOutlet(outlet.id);
      } catch (e) {
        logger.warn("Failed to switch/init cart during outlet select:", e);
        try {
          const { initializeCartForOutlet } = useCartStore.getState();
          await initializeCartForOutlet(outlet.id);
        } catch (ie) {
          logger.warn("Fallback initializeCartForOutlet failed:", ie);
        }
      }

      router.push("/home");
    } catch (error) {
      logger.error("Error selecting outlet:", error);
    } finally {
      // Remove outlet from loading set
      setLoadingOutlets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(outlet.id);
        return newSet;
      });
    }
  };

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="border border-[#EAEAEA] p-3 rounded-2xl flex justify-between items-center animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
      <div className="bg-gray-200 p-2 rounded-full">
        <div className="w-4 h-4"></div>
      </div>
    </div>
  );

  return (
    <section
      id="locations"
      className="w-full h-fit lg:min-h-screen bg-gray-100 px-6 py-10 md:p-12 lg:px-16 lg:py-10"
    >
      <div className="flex flex-col-reverse md:flex-row h-full">
        {/* Image Container - Fixed height to match content */}
        <div className="flex-1 relative h-full min-h-[400px] md:min-h-[600px]">
          <Image
            src={LeftImage}
            alt="left image"
            fill
            className="object-cover rounded-b-3xl md:rounded-none md:rounded-l-3xl"
          />
        </div>

        {/* Content Container */}
        <div className="flex-1 bg-white rounded-t-3xl md:rounded-none md:rounded-r-3xl overflow-hidden flex flex-col">
          <div className="bg-black p-5 text-white">
            <p className="text-3xl text-center md:text-start font-semibold">
              Restaurants
            </p>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1  max-h-full md:max-h-[500px] p-5 md:p-10">
            <div className="flex flex-col space-y-3">
              {loading ? (
                // Show skeleton loaders while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonLoader key={index} />
                ))
              ) : error ? (
                // Error state
                <div className="text-center py-8 text-black">
                  <p>Failed to load outlets: {error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-black text-white px-4 py-2 rounded-full hover:bg-black transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : outlets.length === 0 ? (
                // Empty state
                <div className="text-center py-8 text-gray-500">
                  <p>No outlets available at the moment.</p>
                </div>
              ) : (
                // Outlets list
                outlets.map((outlet) => {
                  const isLoading = loadingOutlets.has(outlet.id);
                  return (
                    <div
                      className={`border border-[#EAEAEA] p-3 rounded-2xl flex justify-between items-center hover:shadow-md transition-all duration-200 cursor-pointer ${
                        isLoading ? "opacity-70" : ""
                      }`}
                      key={outlet.id}
                      onClick={() => !isLoading && saveNewOutlet(outlet)}
                    >
                      <p className="font-medium">{outlet.name}</p>
                      <div
                        className={`p-2 rounded-full cursor-pointer transition-colors ${
                          isLoading
                            ? "bg-[#FF611E1F]/20 text-black"
                            : "bg-[#FF611E1F]/12 text-black hover:bg-[#FF611E1F]/20"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLoading) {
                            saveNewOutlet(outlet);
                          }
                        }}
                      >
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <ArrowRight size={18} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
