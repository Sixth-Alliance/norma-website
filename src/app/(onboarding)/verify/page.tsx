"use client";

import Image from "next/image";
import NormaLogo from "@/src/assets/svg/onboarding-assets/NormaLogo.svg";
import AppInputOTP from "@/src/components/onboarding-components/verify/AppInputOTP";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const page = () => {
  // zustand
  const { emailForOTP, isUserAuthenticated } = useAuthStore((state: any) => state);
  const router = useRouter();

  useEffect(() => {
    // If the user is already authenticated, redirect to home to avoid showing the OTP page
    try {
      if (isUserAuthenticated && isUserAuthenticated()) {
        router.replace('/home');
      }
    } catch (err) {
      // no-op
    }
  }, [isUserAuthenticated, router]);

  return (
    <section className="grid grid-cols-2">
      <div className="col-span-full lg:col-span-1 bg-background-dark lg:bg-background h-screen flex flex-col lg:flex-row items-center lg:p-36">
        <div className="bg-black flex w-full py-10 place-items-center lg:hidden">
          <Image
            src={NormaLogo}
            alt="NormaLogo"
            className="object-cover h-[80px] w-auto mx-auto"
          ></Image>
        </div>

        <section className="w-full px-6 pt-8 lg:bg-background-dark lg:p-8 lg:rounded-2xl">
          <div>
            <p className="font-bold text-2xl mb-1   text-center">
              Enter Verification code
            </p>

            <p className="text-center">
              We sent a verification code to{" "}
              <span className="font-semibold">{emailForOTP}</span>
            </p>
          </div>

          {/* verify otp input  */}
          <div className="my-5">
            <AppInputOTP />
          </div>

          {/* <div className="flex gap-1">
            <p className="">Didn’t get a code? </p>
            <p className="text-orange font-semibold">Resend code</p>
          </div> */}
        </section>
      </div>

      <div className="hidden lg:col-span-1 bg-black sticky top-0 h-screen lg:flex place-items-center">
        <Image
          src={NormaLogo}
          alt="NormaLogo"
          className="object-cover h-[70px] w-auto mx-auto"
        ></Image>
      </div>
    </section>
  );
};

export default page;
