import MobileView from "@/src/components/home-components/Address/MobileView";
import DesktopView from "@/src/components/home-components/Address/DesktopView";
import React from "react";

const Page = () => {
  return (
    <div className="bg-white w-full min-h-screen">
      {/* Mobile View */}
      <div className="p-3 md:hidden">
        <MobileView />
      </div>
      
      {/* Desktop View */}
      <DesktopView />
    </div>
  );
};

export default Page;
