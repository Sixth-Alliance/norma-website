"use client";

import Image from "next/image";
import { Button } from "@/src/ui/button";
import Divider from "@/src/ui/Divider";
import GoogleIcon from "@/src/assets/svg/onboarding-assets/GoogleIcon.svg";
import LockKeyIcon from "@/src/assets/svg/onboarding-assets/LockKeyIcon.svg";
import NormaLogo from "@/src/assets/svg/onboarding-assets/NormaLogo.svg";

import { Separator } from "@/src/ui/separator";
import LoginForm from "@/src/components/onboarding-components/login/LoginForm";
import { useAuthStore } from "@/src/store/authStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const page = () => {
  // redirect authenticated users away from onboarding
  const { isUserAuthenticated, user } = useAuthStore((state: any) => state);
  const router = useRouter();

  useEffect(() => {
    try {
      const isAuth = isUserAuthenticated && isUserAuthenticated();
      
      if (isAuth) {
        router.replace('/home');
      }
    } catch (err) {
      console.error('[Onboarding] Auth check error:', err);
    }
  }, [isUserAuthenticated, user, router]);

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
            <p className="font-bold text-2xl mb-1">Welcome to Norma</p>
            <div className="flex gap-1">
              <p className="text-orange font-semibold">
                Please sign in or sign up below{" "}
              </p>
            </div>
          </div>

          {/* login form */}
          <LoginForm />

          {/* buttons */}
          <div className="flex flex-col gap-3">
            {/* google button */}
            {/* <Button className="font-semibold py-6 text-[16px] bg-background text-foreground hover:bg-background-dark hover:border-[1px] hover:border-foreground">
              <Image
                src={GoogleIcon}
                alt="GoogleIcon"
                height={20}
                width={20}
                className="mr-1"
              />
              Sign in with Google
            </Button> */}

            {/* apple button */}
            {/* <Button className="font-semibold py-6 text-[16px] bg-background text-foreground hover:bg-background-dark hover:border-[1px] hover:border-foreground">
              <Image
                src={LockKeyIcon}
                alt="LockKeyIcon"
                height={20}
                width={20}
                className="mr-1"
              />
              Sign in with Passkey
            </Button> */}
          </div>
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
