// "use client";
import React from "react";
import CowHeadDesktop from "@/src/assets/images/Trial_1-removebg-preview.png";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import Image from "next/image";
import Link from "next/link";
const Headers = () => {
  return (
    <header className="h-full w-full bg-white relative" role="banner">
      {/* Navigation Bars */}
      <Navbar />
      <MobileNav />

      <div className="md:pl-12 lg:pl-16 pl-5 flex md:flex-row flex-col md:justify-between md:items-center">
        {/* Content Section */}
        <div className=" flex flex-col space-y-3">
          <h1 className="text-[28px] md:text-[38px] text-black w-[95%] md:w-[65%] font-bold leading-tight  md:leading-normal mt-28 md:mt-0">
            We make it easy to order from your favorite Norma outlet, track your
            food in real time.
          </h1>
          <p className="text-[16px] md:text-[22px] text-[#737373] w-[95%] md:w-[70%] leading-relaxed">
            Order fresh, local favorites from any Norma outlet and get them
            delivered fast, hot, tasty, and right on time.
          </p>
          <Link
            href="/home/outlets"
            className="bg-[#404040] text-white font-semibold cursor-pointer py-3 md:py-3 px-8 md:px-8 rounded-full text-lg md:text-base lg:text-lg w-fit hover:bg-[#404040] transition-colors mt-5"
            aria-label="Start ordering food from Norma outlets"
          >
            Order Now
          </Link>
        </div>
        <div className="-mt-24 md:-mt-0 flex justify-end items-end md:flex-none pointer-events-none">
          <Image src={CowHeadDesktop} alt="" />
        </div>
      </div>
    </header>
  );
};

export default Headers;
