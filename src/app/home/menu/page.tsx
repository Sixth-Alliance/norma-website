"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MenuPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the home page where the menu/products are displayed
    router.replace("/home");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto mb-4"></div>
        <p>Redirecting to menu...</p>
      </div>
    </div>
  );
};

export default MenuPage;