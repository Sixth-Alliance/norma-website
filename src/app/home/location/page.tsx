"use client";
import MobileView from "@/src/components/home-components/Location/MobileView";
import React from "react";
import DesktopBg from "@/src/assets/images/desktop-bk.svg";
import Image from "next/image";
import CustomButton from "@/src/components/home-components/CustomButton";
import LocationIcon from "@/src/assets/images/location.svg";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/ui/select";
const Page = () => {
  const router = useRouter();
  const handleContinue = () => {
    //push to home
    router.push("/home");
  };
  return (
    <div className="bg-white p-3 w-full h-screen flex flex-col justify-center items-center overflow-hidden">
      <div className="grid grid-col-1 md:grid-cols-2 gap-5">
        {/* <MobileView /> */}
        <div className="flex flex-col justify-center items-center gap-28">
          <div className="flex flex-col justify-center gap-2 items-center">
            <Image src={LocationIcon} alt="" width={194} height={194} style={{ width: "auto", height: "auto" }} />
            <p className="text-xl md:text-2xl font-semibold text-center mt-8">
              Select an Outlet close to you
            </p>
            <Select>
              <SelectTrigger className="w-full mt-5 bg-background py-5">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <CustomButton
              title="Continue"
              handleClick={handleContinue}
              others="w-full mt-10"
            />
          </div>
        </div>
        <div className="hidden md:block">
          <Image src={DesktopBg} alt="" />
        </div>
      </div>
    </div>
  );
};

export default Page;
