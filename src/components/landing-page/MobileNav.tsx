"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import Logo from "@/src/assets/images/newLogo.svg";
import { MenuIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileLogo from "@/src/assets/images/mobile_logo_new.svg";
import MobileLogoWhite from "@/src/assets/images/norma_white.png";

const MobileNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 70);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  return (
    <>
      {/* Sticky Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 flex items-center justify-between z-50 px-4 py-4 transition-all duration-300  ${
          isScrolled ? "bg-black" : "bg-transparent"
        } flex md:hidden`}
      >
        <Image
          src={MobileLogo}
          alt="Norma logo"
          className={`cursor-pointer ${isScrolled ? "hidden" : "block"}`}
          onClick={() => router.push("/")}
        />
        <Image
          src={MobileLogoWhite}
          alt="Norma Logo"
          className={`cursor-pointer w-[117px] h-[38px] ${isScrolled ? "flex" : "hidden"}`}
          onClick={() => router.push("/")}
        />

        <button
          onClick={openMenu}
          className={`p-2 ${isScrolled ? "text-white" : "text-black"}`}
        >
          <MenuIcon size={24} />
        </button>
      </nav>

      {/* Mobile Menu Overlay - Always in DOM but hidden with transform */}
      <div
        className={`fixed inset-0 z-50 bg-black flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={closeMenu}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
          >
            <X size={28} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col justify-center items-start space-y-0 px-8 w-full">
          <button
            onClick={() => scrollToSection("story")}
            className="text-white text-2xl font-semibold hover:text-[#FF611E] transition-all duration-200 w-full text-left py-6 border-b border-[#EAEAEA]"
          >
            Our Story
          </button>

          <button
            onClick={() => scrollToSection("locations")}
            className="text-white text-2xl font-semibold hover:text-[#FF611E] transition-all duration-200 w-full text-left py-6 border-b border-[#EAEAEA]"
          >
            Locations
          </button>

          <button
            onClick={() => scrollToSection("faq")}
            className="text-white text-2xl font-semibold hover:text-[#FF611E] transition-all duration-200 w-full text-left py-6 border-b border-[#EAEAEA]"
          >
            FAQs
          </button>

          <div className="w-full mt-10">
            <button
              onClick={() => {
                router.push("/home/outlets");
                closeMenu();
              }}
              className="bg-[#404040] text-white font-semibold py-3 px-8 rounded-full text-lg w-full hover:bg-[#E5561B] transition-all duration-200 transform hover:scale-105"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
