"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signinValidationSchema } from "@/src/types/authSchemas";

import { onSignin } from "@/src/app/actions/userAuthActions";

import { Button } from "@/src/ui/button";
import { Input } from "@/src/ui/input";

import { showSimpleToast } from "@/src/utils/alertFunctions";
import { useAuthStore } from "@/src/store/authStore";
import { Separator } from "@/src/ui/separator";

const LoginForm = () => {
  const [btnState, setBtnState] = useState(false);
  const [isFromCheckout, setIsFromCheckout] = useState(false);

  // zustand
  const { setEmailForOTPstate } = useAuthStore((state: any) => state);

  // router
  const router = useRouter();

  // Check if user was redirected from checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl && redirectUrl.includes('/cart')) {
        setIsFromCheckout(true);
      }
    }
  }, []);

  const form = useForm<z.infer<typeof signinValidationSchema>>({
    resolver: zodResolver(signinValidationSchema),
    defaultValues: {
      email: "",
      purpose: "magic_auth",
    },
  });

  async function onSubmit(data: z.infer<typeof signinValidationSchema>) {
    setBtnState(true);

    const result = await onSignin(data);

    if (result.success === true) {
      setEmailForOTPstate(data.email);
      showSimpleToast("Check your email for the verification code", "success");
      router.push("/verify");
    } else {
      showSimpleToast("There is an error", "failed");
      setBtnState(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      // Redirect to our custom Google auth endpoint
      window.location.href = '/api/google-auth'
    } catch (error) {
      showSimpleToast("Google sign-in failed", "error")
    }
  }

  return (
    <>
      {/* Show checkout context message if redirected from cart */}
      {isFromCheckout && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-800">
              Sign in to complete your checkout securely
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-5 flex flex-col gap-3"
        >
          {/* username */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className={`font-medium px-5 py-6 rounded-xl bg-background outline-none border-none placeholder:text-foreground-lighter placeholder:font-normal focus:outline-none`}
                    placeholder="johndoe@norma.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            className="mt-1 bg-foreground text-base text-background hover:bg-background hover:text-foreground hover:border-[1px] hover:border-foreground px-10 py-6 rounded-3xl lg:mx-auto w-full"
            type="submit"
            disabled={btnState}
          >
            {!btnState ? "Sign in with email" : "Signing in..."}
          </Button>
        </form>
      </Form>

      <Separator className="mt-4 border" />

      {/* Google Auth Button */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          aria-label="Sign in with Google"
          role="button"
          tabIndex={0}
          onTouchStart={(e) => {
            // improve perceived responsiveness on mobile by hinting touch intent
            // (no-op but removes the 300ms-like delay on some browsers)
            e.currentTarget.style.touchAction = 'manipulation'
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md active:scale-95 transform-gpu transition-all text-gray-700 font-medium cursor-pointer select-none"
          onClick={handleGoogleSignIn}
          style={{ marginTop: '1rem', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_17_40)">
              <path d="M23.9999 12.2763C23.9999 11.4607 23.9307 10.6716 23.8126 9.90918H12.2393V14.3681H18.8976C18.6226 15.8572 17.7407 17.0954 16.4535 17.9092V20.5481H20.3676C22.2735 18.8281 23.9999 15.8654 23.9999 12.2763Z" fill="#4285F4" />
              <path d="M12.2393 24C15.3276 24 17.8976 22.9763 19.7407 21.2381L16.4535 17.9091C15.3763 18.6372 13.9276 19.0718 12.2393 19.0718C9.25761 19.0718 6.7407 17.3291 5.85352 14.8054H1.82349V17.5236C3.65931 21.4436 7.65352 24 12.2393 24Z" fill="#34A853" />
              <path d="M5.85352 14.8054C5.62609 14.0772 5.49997 13.3054 5.49997 12.5C5.49997 11.6945 5.62609 10.9227 5.85352 10.1945V7.47632H1.82349C0.991304 9.09454 0.499969 10.7427 0.499969 12.5C0.499969 14.2572 0.991304 15.9054 1.82349 17.5236L5.85352 14.8054Z" fill="#FBBC05" />
              <path d="M12.2393 5.92818C14.0407 5.92818 15.5481 6.54818 16.6535 7.60001L19.8261 4.47636C17.8976 2.85719 15.3276 1.8335 12.2393 1.8335C7.65352 1.8335 3.65931 4.38914 1.82349 8.30914L5.85352 11.0273C6.7407 8.5035 9.25761 5.92818 12.2393 5.92818Z" fill="#EA4335" />
            </g>
            <defs>
              <clipPath id="clip0_17_40">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
          Sign in with Google
        </button>
      </div>
    </>
  );
};

export default LoginForm;
