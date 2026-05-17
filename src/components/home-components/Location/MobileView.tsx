"use client";
import Image from "next/image";
import React from "react";
import CustomButton from "../CustomButton";
import LocationIcon from '@/src/assets/images/location.svg';
import { useRouter } from "next/navigation";
const MobileView = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-28 md:hidden">
      <div className="flex flex-col justify-center gap-2 items-center">
        <Image
          src={LocationIcon}
          alt=""
          width={194}
          height={194}
        />
        <p className="text-xl font-semibold text-center">
          Add your address to discover what’s available near you.
        </p>
      </div>
      <CustomButton
        title="Choose delivery Address"
        handleClick={() => router.push("/home/location/address")}
      />
    </div>
  );
};

export default MobileView;
