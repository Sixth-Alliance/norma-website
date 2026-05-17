"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/ui/tabs";
import SingleFood from "./SingleFood";
import Image5 from "@/src/assets/images/image_food.svg";
import FoodModal from "./FoodModal";
import FoodModalMobile from "./FoodModalMobile";
import { StaticImageData } from "next/image";
import useCountStore from "@/src/store/CounterStore";
import { logger } from "@/src/utils/logger";
import { useCartStore } from "@/src/store/CartStore";
import { useOutletStore } from "@/src/store/OutletStore";
import { Skeleton } from "@/src/ui/skeleton";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import {
  getAllProducts,
  getAllProductsOptimized,
  getSingleProduct,
  addToCart,
  getCurrentCart,
} from "@/src/app/api/action";
import { getCartToken } from "@/src/lib/tokens";
import { getCookie } from "@/src/lib/tokens";
import ErrorComponent from "../ErrorComponent";
import CustomButton from "../CustomButton";
import { SessionManager } from "@/src/utils/session";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

// Note: previously a global String.prototype.trim override was added as a
// last-resort safety measure. That can mask root causes and create strange
// runtime behaviors. Instead we make local call sites defensive. The unsafe
// global override has been removed.

// Add ProductsResponse interface
interface ProductsResponse {
  count: number;
  page_info: {
    current_page: number;
    total_pages: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
    next: string | null;
    previous: string | null;
  };
  results: Product[];
}

interface Product {
  id: string;
  title: string;
  category_name: string;
  outlet_name: string;
  outlet?: string; // outlet id/uuid from API
  price: number; // Fixed: number to match API
  main_image_url: string;
  availability_status: string;
  is_active: boolean;
}

interface FoodItem {
  id: string;
  title: string;
  sub_title: string;
  price: number; // Fixed: number instead of string to match API
  delivery_time: string;
  description: string;
  image: string | StaticImageData;
  dietary_labels?: any[] | null;
  variants?: any[] | null;
  options?: any[] | null;
  categories_for_outlet?: Array<{ id: string; name: string }>;
  created_at?: string;
  updated_at?: string;
  uuid?: string;
  outlet_uuid?: string;
}
// Use centralized getCookie from src/lib/tokens
// Helper to get session ID from cookies
const getSessionId = (): string | null => {
  return (
    getCookie("sessionid") || getCookie("sessionId") || getCookie("userToken")
  );
};
// Removed verbose cookie logging to avoid leaking tokens in production
const debugCookies = () => {};
// Helper to normalize ID into a stable string key (use UUIDs directly)
const hashString = (str: string): string => {
  return String(str || Date.now());
};

const Foods = () => {
  const { selectedOutlet } = useOutletStore();
  const { quantityCounts, increment, decrement } = useCountStore();
  const { addItem, updateQuantity, syncCartFromBackend } = useCartStore();
  const [sessionManager] = useState(() => SessionManager.getInstance());

  const [activeTab, setActiveTab] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [productsData, setProductsData] = useState<ProductsResponse | null>(
    null
  );
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products
  const [categories, setCategories] = useState<string[]>(["All"]);

  useEffect(() => {
    const initializeSession = async () => {
      if (selectedOutlet?.id) {
        try {
          // logger.info("Initializing session for outlet", selectedOutlet.id);
          const sessionInfo = await sessionManager.getOrCreateSession(
            selectedOutlet.id
          );

          // Fetch current cart with the new session
          const currentCart = await getCurrentCart(selectedOutlet.id);
          syncCartFromBackend(currentCart);
        } catch (error) {
          logger.error("Failed to initialize session for outlet", error);
        }
      }
    };

    initializeSession();
  }, [selectedOutlet?.id, sessionManager, syncCartFromBackend]);

  // Handle mounting for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);
  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const token = getCookie("userToken");

  // ⚡ OPTIMIZED: Fetch all products in one request (much faster!)
  const fetchAllProducts = useCallback(async () => {
    try {
      setLoading(true);
      const outletId = selectedOutlet?.id;

      // Use the optimized endpoint that returns ALL products in one request
      const response = await getAllProductsOptimized(outletId);

      setProductsData(response);
      setAllProducts(response.results || []);

      // Extract unique categories from all products
      const uniqueCategories: string[] = Array.from(
        new Set(
          (response.results || [])
            .map((product: Product) => product.category_name)
            .filter((name: string | undefined): name is string => Boolean(name))
        )
      );

      setCategories(["All", ...uniqueCategories]);

      setError(null);
    } catch (error: any) {
      console.error("[Foods] 🔍 DEBUG - Error details:", error);
      setError(error.message || "Failed to fetch products");
      console.error("[Foods] ❌ Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet?.id]);

  // Fetch products when outlet changes
  useEffect(() => {
    if (selectedOutlet?.id) {
      fetchAllProducts();
      setCurrentPage(1); // Reset to first page when outlet changes
    }
  }, [selectedOutlet?.id, fetchAllProducts]);

  // Reset to page 1 when tab changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Filter products based on selected outlet and category
  // Filter and group products based on selected outlet and category
  const filteredProducts = useMemo(() => {
    // Define the desired category order
    const categoryOrder = [
      "Sides",
      "Sauces",
      "Sandwiches & Burgers",
      "Grills",
      "Extras",
    ];

    const products = allProducts.filter((product) => {
      // Your existing filtering logic
      const productOutletId =
        (product as any).outlet ||
        (product as any).outlet_id ||
        (product as any).outlet_uuid ||
        null;
      const matchesOutlet = selectedOutlet
        ? productOutletId
          ? String(productOutletId) === String(selectedOutlet?.id)
          : product.outlet_name === (selectedOutlet?.name || "")
        : true;

      const matchesCategory =
        activeTab === "All" ? true : product.category_name === activeTab;

      const availability = String(
        product.availability_status || ""
      ).toLowerCase();
      const isActive =
        product.is_active === true ||
        String(product.is_active).toLowerCase() === "true";
      const isAvailable = availability === "available" && isActive;

      return matchesOutlet && matchesCategory && isAvailable;
    });

    // If we're on the "All" tab, sort by the defined category order
    if (activeTab === "All") {
      return products.sort((a, b) => {
        const aCategory = a.category_name || "Other";
        const bCategory = b.category_name || "Other";

        const aIndex = categoryOrder.indexOf(aCategory);
        const bIndex = categoryOrder.indexOf(bCategory);

        // If both categories are in our ordered list, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }

        // If only A is in the ordered list, it comes first
        if (aIndex !== -1) {
          return -1;
        }

        // If only B is in the ordered list, it comes first
        if (bIndex !== -1) {
          return 1;
        }

        // If neither is in the ordered list, sort alphabetically
        return aCategory.localeCompare(bCategory);
      });
    }

    // For specific tabs, return as-is (no special sorting)
    return products;
  }, [allProducts, selectedOutlet, activeTab]);

  // Client-side pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetPagination();
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoveClick = (item: string) => {
    // console.log(`I love this item ${item}`);
  };

  const handleModalBox = async (product: Product) => {
    try {
      setLoadingProduct(true);
      setSelectedProduct(product);

      const detailedProduct = await getSingleProduct(product.id);

      const foodItem: FoodItem = {
        id: product.id ? hashString(String(product.id)) : String(Date.now()),
        image:
          detailedProduct.main_image_url ||
          detailedProduct.main_image ||
          Image5,
        title: detailedProduct.title,
        sub_title: detailedProduct.category_name,
        price: detailedProduct.price,
        delivery_time: "20 - 30mins",
        description:
          detailedProduct.description ||
          `Delicious ${detailedProduct.title} from ${detailedProduct.outlet_name}`,
      };

      setSelectedFood(foodItem);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching product details:", error);
      setSelectedProduct(product);
      // Extra safety for fallback product data
      const safeTitle = String(product.title || "Unknown Item");
      const safeOutletName = String(product.outlet_name || "Restaurant");
      const safeCategoryName = String(product.category_name || "Food");

      setSelectedFood({
        id: product.id ? hashString(String(product.id)) : String(Date.now()),
        image: product.main_image_url || Image5,
        title: safeTitle,
        sub_title: safeCategoryName,
        price: Number(product.price) || 0,
        delivery_time: "20 - 30mins",
        description: `Delicious ${safeTitle} from ${safeOutletName}`,
      });
      setIsModalOpen(true);
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFood(null);
    setSelectedProduct(null);
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleIncrement = (itemId: string) => {
    increment(itemId);
  };

  const handleDecrement = (itemId: string) => {
    decrement(itemId);
  };

  const handleAddToCart = async (itemId: string) => {
    const quantity = quantityCounts[itemId] || 1;

    if (!selectedFood || !selectedProduct || !selectedOutlet?.id) {
      showSimpleToast("Please select an outlet first", "failed");
      return;
    }

    // Validate product id looks like a UUID to catch stale/UI-bug IDs early
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = (s: string) => !!s && uuidRegex.test(s);

    if (!isUuid(selectedProduct.id)) {
      logger.error("Bad product id format when adding to cart:", {
        productId: selectedProduct.id,
        outlet: selectedOutlet.id,
      });
      showSimpleToast(
        "Failed to add item to cart: invalid product identifier",
        "failed"
      );
      return;
    }

    try {
      setIsAddingToCart(true);
      logger.info("Add to cart", {
        product: selectedProduct?.id,
        outlet: selectedOutlet?.id,
        quantity,
      });

      // Use the new async addItem that handles both local state and backend
      await addItem(
        {
          id: selectedProduct.id, // Use the UUID directly
          title: selectedFood.title,
          sub_title: selectedFood.sub_title,
          price: selectedFood.price, // Already a number
          image: selectedFood.image,
        },
        selectedOutlet.id,
        selectedProduct.id,
        quantity
      ); // Pass the actual product UUID and quantity

      logger.info("Item successfully added to cart");
      // Toast is shown by addItem in CartStore - don't show duplicate

      // Close modal after successful add
      setIsModalOpen(false);
    } catch (error) {
      logger.error("Failed to add item to cart:", error);
      // Error message is already shown by the addItem function
    } finally {
      setIsAddingToCart(false);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(5, totalPages);
    }

    if (currentPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  // Don't render until we know the screen size
  if (isMobile === null) {
    return <div className="w-full min-h-screen bg-background"></div>;
  }

  if (loading) {
    return (
      <div className="w-full pb-16">
        {/* Tabs Skeleton */}
        <div className="overflow-auto md:overflow-x-auto flex md:flex-nowrap mb-6">
          <div className="gap-2 md:gap-6 flex-shrink-0 my-2 flex">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
              <div
                key={item}
                className="h-12 md:h-16 bg-gray-200 rounded-lg md:rounded-xl p-4 md:px-6 animate-pulse"
                style={{
                  width:
                    item === 1
                      ? "60px"
                      : item === 2
                      ? "80px"
                      : item === 3
                      ? "90px"
                      : "120px",
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Food Items Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8 mb-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div
              key={item}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="h-[140px] md:h-[160px] bg-gray-200 animate-pulse relative"></div>
              <div className="p-3 md:p-4">
                <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded mb-3 animate-pulse w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 animate-pulse w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorComponent error={error} />;
  }

  if (!selectedOutlet) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-lg text-foreground">
          Please select an outlet to view products
        </p>
      </div>
    );
  }

  // Prevent hydration mismatch by checking if component is mounted
  if (!mounted) {
    return (
      <div className="w-full pb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
              >
                <div className="h-[140px] md:h-[160px] bg-gray-200 animate-pulse"></div>
                <div className="p-3 md:p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3 animate-pulse w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full pb-16">
        <Tabs defaultValue="All" value={activeTab} className="w-full">
          {/* Tabs List */}
          <div className="overflow-auto md:overflow-x-auto flex md:flex-nowrap">
            <TabsList className="gap-2 md:gap-6 flex-shrink-0 my-2 bg-none md:bg-none">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  onClick={() => handleTabChange(category)}
                  className={`text-sm md:text-xl md:px-6 md:py-5 bg-background md:bg-background-dark text-foreground rounded-lg md:rounded-xl p-4 md:border md:border-[#EAEAEA] ${
                    activeTab === category
                      ? "data-[state=active]:bg-orange data-[state=active]:text-background border-none"
                      : ""
                  }`}
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/***All Food Tabs */}
          {categories.map((category) => (
            // Inside your TabsContent for each category, replace the current grid with:
            <TabsContent key={category} value={category}>
              {currentProducts.length === 0 ? (
                // Your existing empty state
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  {/* Empty State Icon */}
                  <div className="mb-6">
                    <svg
                      className="w-24 h-24 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>

                  {/* Empty State Text */}
                  <div className="text-center max-w-md">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Products Available
                    </h3>
                    <p className="text-foreground-lighter leading-relaxed">
                      {category === "All" ? (
                        <>
                          We couldn't find any products at{" "}
                          <span className="font-medium text-orange">
                            {selectedOutlet?.name || "this outlet"}
                          </span>
                          . Please check back later or try a different location.
                        </>
                      ) : (
                        <>
                          No{" "}
                          <span className="lowercase font-medium text-orange">
                            {category}
                          </span>{" "}
                          items are currently available at{" "}
                          <span className="font-medium text-orange">
                            {selectedOutlet?.name || "this outlet"}
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Group products by category for the "All" tab */}
                  {activeTab === "All" ? (
                    // Grouped view for All tab
                    (() => {
                      // Group products by category
                      const groupedProducts = currentProducts.reduce(
                        (groups, product) => {
                          const categoryName = product.category_name || "Other";
                          if (!groups[categoryName]) {
                            groups[categoryName] = [];
                          }
                          groups[categoryName].push(product);
                          return groups;
                        },
                        {} as Record<string, Product[]>
                      );

                      // Define the desired category order
                      const categoryOrder = [
                        "Sides",
                        "Sauces",
                        "Sandwiches & Burgers",
                        "Grills",
                        "Extras",
                      ];

                      // Sort categories according to the defined order
                      const sortedCategories = Object.keys(
                        groupedProducts
                      ).sort((a, b) => {
                        const aIndex = categoryOrder.indexOf(a);
                        const bIndex = categoryOrder.indexOf(b);

                        if (aIndex !== -1 && bIndex !== -1)
                          return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return sortedCategories.map((categoryName) => (
                        <div key={categoryName} className="mb-8">
                          {/* Category Title */}
                          <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
                            {categoryName}
                          </h2>

                          {/* Products Grid for this Category */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-6 items-stretch">
                            {groupedProducts[categoryName].map((product) => {
                              const safeProduct = {
                                id: String(product.id || ""),
                                title: String(product.title || ""),
                                category_name: String(
                                  product.category_name || ""
                                ),
                                main_image_url: String(
                                  product.main_image_url || ""
                                ),
                                price: Number(product.price) || 0,
                              };

                              return (
                                <div key={safeProduct.id} className="h-full">
                                  <SingleFood
                                    handleLoveClick={() =>
                                      handleLoveClick(
                                        hashString(safeProduct.id)
                                      )
                                    }
                                    image={safeProduct.main_image_url || Image5}
                                    title={(() => {
                                      try {
                                        const titleStr = String(
                                          safeProduct.title || ""
                                        );
                                        const replaced = titleStr.replace(
                                          /\[\s*new\s*\]$/i,
                                          ""
                                        );
                                        return typeof replaced === "string"
                                          ? replaced.trim()
                                          : titleStr;
                                      } catch (e) {
                                        console.error(
                                          "Error processing title:",
                                          e,
                                          "Original title:",
                                          safeProduct.title
                                        );
                                        return String(
                                          safeProduct.title || "Product"
                                        );
                                      }
                                    })()}
                                    rawTitle={safeProduct.title}
                                    sub_title={safeProduct.category_name}
                                    price={safeProduct.price.toString()}
                                    handleModalBox={() =>
                                      handleModalBox(product)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    // Regular grid for specific categories
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8 mb-5 items-stretch">
                      {currentProducts.map((product, index) => {
                        const safeProduct = {
                          id: String(product.id || ""),
                          title: String(product.title || ""),
                          category_name: String(product.category_name || ""),
                          main_image_url: String(product.main_image_url || ""),
                          price: Number(product.price) || 0,
                        };

                        return (
                          <div key={safeProduct.id} className="h-full">
                            <SingleFood
                              handleLoveClick={() =>
                                handleLoveClick(hashString(safeProduct.id))
                              }
                              image={safeProduct.main_image_url || Image5}
                              title={(() => {
                                try {
                                  const titleStr = String(
                                    safeProduct.title || ""
                                  );
                                  const replaced = titleStr.replace(
                                    /\[\s*new\s*\]$/i,
                                    ""
                                  );
                                  return typeof replaced === "string"
                                    ? replaced.trim()
                                    : titleStr;
                                } catch (e) {
                                  console.error(
                                    "Error processing title:",
                                    e,
                                    "Original title:",
                                    safeProduct.title
                                  );
                                  return String(safeProduct.title || "Product");
                                }
                              })()}
                              rawTitle={safeProduct.title}
                              sub_title={safeProduct.category_name}
                              price={safeProduct.price.toString()}
                              handleModalBox={() => handleModalBox(product)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8 mb-8">
                      {/* Previous Button */}
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg border ${
                          currentPage > 1
                            ? "bg-background text-foreground border-gray-300 hover:bg-gray-50 cursor-pointer"
                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex space-x-1">
                        {generatePageNumbers().map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageClick(page)}
                            className={`px-3 py-2 rounded-lg border ${
                              page === currentPage
                                ? "bg-orange text-white border-orange"
                                : "bg-background text-foreground border-gray-300 hover:bg-gray-50 cursor-pointer"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-lg border ${
                          currentPage < totalPages
                            ? "bg-background text-foreground border-gray-300 hover:bg-gray-50 cursor-pointer"
                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {isModalOpen &&
          selectedFood &&
          (isMobile ? (
            <FoodModalMobile
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              foodItem={selectedFood}
              handleDecrement={() => handleDecrement(selectedFood.id)}
              handleIncrement={() => handleIncrement(selectedFood.id)}
              handleAddToCart={() =>
                selectedFood && handleAddToCart(selectedFood.id)
              }
              count={quantityCounts[selectedFood.id] || 1}
              isAddingToCart={isAddingToCart}
            />
          ) : (
            <FoodModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              foodItem={selectedFood}
              handleDecrement={() => handleDecrement(selectedFood.id)}
              handleIncrement={() => handleIncrement(selectedFood.id)}
              handleAddToCart={() =>
                selectedFood && handleAddToCart(selectedFood.id)
              }
              count={quantityCounts[selectedFood.id] || 1}
              isAddingToCart={isAddingToCart}
            />
          ))}
      </div>
    </ErrorBoundary>
  );
};

export default Foods;
