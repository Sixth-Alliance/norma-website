import Image from "next/image";
import React from "react";
import MobileLogoWhite from "@/src/assets/images/norma_white.png";
import NormaLogo from "@/src/assets/images/norma-logo.svg";
import InstragramLogo from "@/src/assets/images/instagram.svg";
import FacebookLogo from "@/src/assets/images/facebook-01.svg";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="bg-black flex flex-col justify-center items-center px-3 lg:px-0 py-8">
      {/* <div className="flex flex-row gap-20 items-center"> */}
        <p className="text-white text-[32px] md:text-[40px] font-semibold">
          Pick an Outlet and Order now!
        </p>
      <div className="flex justify-between items-center w-full md:w-[50%] mt-5">
        <Image
          src={NormaLogo}
          alt="norma logo"
          className=" md:w-[152px] h-12 hover:scale-110 transition-transform duration-300 cursor-pointer"
        />
        <div className="flex space-x-5">
          <a href="https://www.instagram.com/norma_bydbanjos/" target="_blank">
            <Image
              src={InstragramLogo}
              alt="instagram logo"
              className="w-8 h-8 md:w-12 md:h-12 cursor-pointer hover:scale-110 transition-transform duration-300"
            />
          </a>
          {/* <Image
            src={FacebookLogo}
            alt="facebook logo"
            className="w-8 md:w-12 h-8 md:h-12 cursor-pointer hover:scale-110 transition-transform duration-300"
          /> */}
        </div>
      </div>
    </div>
  );
};

export default Footer;
