import Image from "next/image";
import { Button } from "@/src/ui/button";
import Divider from "@/src/ui/Divider";
import GoogleIcon from "@/src/assets/svg/onboarding-assets/GoogleIcon.svg";
import LockKeyIcon from "@/src/assets/svg/onboarding-assets/LockKeyIcon.svg";
import NormaLogo from "@/src/assets/svg/onboarding-assets/NormaLogo.svg";
import AppInput from "@/src/ui/Inputs/AppInput";
import Link from "next/link";
import { Separator } from "@/src/ui/separator";

const page = () => {
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
              <p className="text-orange font-semibold">Please sign in below </p>
            </div>
          </div>

          {/* form */}
          <div className="mt-5 flex flex-col gap-3">
            <AppInput
              value=""
              type="text"
              name="email"
              placeholder="Email address"
              inputClassName="font-medium"
            />

            <AppInput
              value=""
              type="password"
              name="password"
              placeholder="Password"
              inputClassName="font-medium"
            />

            <Link
              href="#"
              className="self-end font-medium text-sm text-foreground-lighter"
            >
              Forgot Password?
            </Link>

            <Link href="dashboard">
              <Button className="mt-1 bg-foreground text-base text-background hover:bg-background hover:text-foreground hover:border-[1px] hover:border-foreground px-10 py-6 rounded-3xl lg:mx-auto w-full">
                Sign in with email
              </Button>
            </Link>
          </div>

          {/* <Separator className="my-4 border" /> */}
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
