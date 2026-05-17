"use client";
import Image from "next/image";
import Logo from "@/src/assets/images/newLogo.svg";
import MobileLogoWhite from "@/src/assets/images/norma_white.png";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`${
        isScrolled ? "fixed bg-black/95 backdrop-blur-sm shadow-sm" : ""
      } top-0 left-0 right-0 items-center justify-between z-50 px-4 md:px-12 lg:px-16 py-5 transition-all duration-300 hidden md:flex`}
    >
      <Image
        src={Logo}
        alt="Norma logo"
        className={`w-[117px] h-[38px] cursor-pointer ${
          isScrolled ? "hidden" : "block"
        }`}
        onClick={() => router.push("/")}
      />
      <Image
        src={MobileLogoWhite}
        alt="Norma Logo"
        className={`cursor-pointer w-[117px] h-[38px] ${
          isScrolled ? "flex" : "hidden"
        }`}
        onClick={() => router.push("/")}
      />
      <ul className="flex items-center gap-10 text-black bg-white py-4 px-7 rounded-full">
        <li>
          <a
            href="#story"
            className="text-lg md:text-base lg:text-lg font-semibold"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("story")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Our Story
          </a>
        </li>
        <li>
          <a
            href="#locations"
            className="text-lg md:text-base lg:text-lg font-semibold"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("locations")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Locations
          </a>
        </li>
        <li>
          <a
            href="#faq"
            className="text-lg md:text-base lg:text-lg font-semibold"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("faq")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            FAQs
          </a>
        </li>
      </ul>
      <button
        className="bg-[#404040] text-white font-semibold cursor-pointer py-3 md:py-3 px-8 md:px-8 rounded-full text-lg md:text-base lg:text-lg"
        onClick={() => router.push("/home/outlets")}
      >
        Order Now
      </button>
    </nav>
  );
};

export default Navbar;
