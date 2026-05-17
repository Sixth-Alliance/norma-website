"use client";
import Foods from "@/src/components/home-components/FoodTabs/Foods";
import Ads from "@/src/components/home-components/home-contents/Ads";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";

import Image from "next/image";
import React, { useEffect } from "react";
import OutletDropdown from "@/src/components/home-components/OutletDropdown";

const Page = () => {
  return (
      <div className="min-h-screen p-3 md:p-0 bg-background-dark">
        <MobileNavigation />
        <DesktopNavigation />

        {/****Location */}
        <OutletDropdown />
        {/****Ads */}
        {/* <Ads /> */}
        <div className="mt-3 md:px-16 md:mt-10 pb-20">
          <Foods />
        </div>
      </div>
  );
};

export default Page;
