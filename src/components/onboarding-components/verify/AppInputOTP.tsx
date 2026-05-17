"use client";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/src/ui/input-otp";

import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

import { verifyOTPSchema } from "@/src/types/authSchemas";

import { Button } from "@/src/ui/button";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { onVerifyUserOTP } from "@/src/app/actions/userAuthActions";
import { useAuthStore } from "@/src/store/authStore";
import { useCartStore } from "@/src/store/CartStore";
import { useOutletStore } from "@/src/store/OutletStore";
import { requestOTP } from "@/src/app/api/action";

const AppInputOTP = () => {
  const [btnState, setBtnState] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Initialize countdown from localStorage expiry time
  const getInitialCountdown = () => {
    if (typeof window === 'undefined') return 60;

    const stored = localStorage.getItem('otp_expiry_time');
    if (stored) {
      const expiryTime = parseInt(stored, 10);
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      if (remaining > 0) {
        return remaining;
      } else {
        // Expired, clean up
        localStorage.removeItem('otp_expiry_time');
      }
    }
    return 60; // Default: 1 minute = 60 seconds
  };

  const [countdown, setCountdown] = useState(getInitialCountdown);

  // zustand
  const { emailForOTP, storeUserData, verifyOTP, clearEmailForOTP } = useAuthStore((state: any) => state);

  // router
  const router = useRouter();

  const form = useForm<z.infer<typeof verifyOTPSchema>>({
    resolver: zodResolver(verifyOTPSchema),
    defaultValues: {
      email: emailForOTP,
      otp: "",
      purpose: "magic_auth",
    },
  });

  // Countdown timer effect - persists across refreshes and handles tab visibility
  useEffect(() => {
    // Set initial expiry time if not already set
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('otp_expiry_time');
      if (!stored && countdown > 0) {
        const expiryTime = Date.now() + (countdown * 1000);
        localStorage.setItem('otp_expiry_time', expiryTime.toString());
      }
    }

    // Don't run timer if countdown is 0
    if (countdown <= 0) {
      setCanResend(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('otp_expiry_time');
      }
      return;
    }

    // Update countdown every second based on expiry time (not decrement)
    // This ensures accuracy even if tab is backgrounded or user navigates away
    const timer = setInterval(() => {
      if (typeof window === 'undefined') return;

      const stored = localStorage.getItem('otp_expiry_time');
      if (!stored) {
        setCountdown(0);
        setCanResend(true);
        return;
      }

      const expiryTime = parseInt(stored, 10);
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));

      if (remaining <= 0) {
        setCountdown(0);
        setCanResend(true);
        localStorage.removeItem('otp_expiry_time');
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Handle page visibility changes to keep timer accurate
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, sync countdown from localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('otp_expiry_time');
          if (stored) {
            const expiryTime = parseInt(stored, 10);
            const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            setCountdown(remaining);
            if (remaining <= 0) {
              setCanResend(true);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Format countdown as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!emailForOTP || isResending || !canResend) return;

    setIsResending(true);
    try {
      // Use the canonical purpose expected by backend (magic_auth)
      const result = await requestOTP(emailForOTP);

      if (result.success) {
        showSimpleToast("Verification code resent successfully!", "success");
        setCountdown(60); // Reset to 1 minute
        setCanResend(false);

        // Update localStorage with new expiry time
        if (typeof window !== 'undefined') {
          const expiryTime = Date.now() + (60 * 1000);
          localStorage.setItem('otp_expiry_time', expiryTime.toString());
        }
      } else {
        showSimpleToast(result.message || "Failed to resend code", "failed");
      }
    } catch (error) {
      showSimpleToast("Failed to resend code. Please try again.", "failed");
    } finally {
      setIsResending(false);
    }
  };

  async function onSubmit(data: z.infer<typeof verifyOTPSchema>) {
    setBtnState(true);

    // ✍ USING CLIENT SIDE ZUSTAND FOR AUTH FOR NOW, TO CHANGE LATER
    const result = await verifyOTP(data);
    // const result = await onVerifyUserOTP(data);

    if (result.success === true) {
      clearEmailForOTP();

      // Clear OTP expiry from localStorage on successful verification
      if (typeof window !== 'undefined') {
        localStorage.removeItem('otp_expiry_time');
      }

      showSimpleToast("Logged in successfully!", "success");

      // Check if there's a redirect URL stored from checkout flow
      let redirectPath = "/home/outlets"; // default redirect

      if (typeof window !== 'undefined') {
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
        if (storedRedirect) {
          redirectPath = storedRedirect;
          sessionStorage.removeItem('redirectAfterLogin'); // Clean up
          // console.log("🔄 Redirecting back to:", redirectPath);

          // If redirecting to cart, add auto-checkout parameter
          if (redirectPath.includes('/cart')) {
            redirectPath += '?autoCheckout=true';
          }
        }
      }

      router.push(redirectPath);
    } else {
      showSimpleToast(result.message, "failed");
      setBtnState(false);
    }
  }

  useEffect(() => {
    if (emailForOTP) {
      form.reset({ email: emailForOTP, otp: "", purpose: "magic_auth" });
    }

    return () => {
      form.reset({ email: "", otp: "", purpose: "magic_auth" });
    };
  }, [emailForOTP, form]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3 items-center"
        >
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    {...field}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-background" />
                      <InputOTPSlot index={1} className="bg-background" />
                      <InputOTPSlot index={2} className="bg-background" />
                      <InputOTPSlot index={3} className="bg-background" />
                      <InputOTPSlot index={4} className="bg-background" />
                      <InputOTPSlot index={5} className="bg-background" />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Countdown Timer */}
          {countdown > 0 && (
            <p className="text-sm text-foreground-lighter">
              Code expires in <span className="font-semibold text-foreground">{formatTime(countdown)}</span>
            </p>
          )}

          {/* Resend Button */}
          <div className="flex gap-1 items-center">
            <p className="text-sm">Didn't get a code?</p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={!canResend || isResending}
              className={`text-sm font-semibold ${canResend && !isResending
                ? "text-orange cursor-pointer hover:underline"
                : "text-gray-400 cursor-not-allowed"
                }`}
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </div>

          <Button
            className="bg-foreground text-base text-background hover:bg-background hover:text-foreground hover:border-[1px] hover:border-foreground px-8 py-5 rounded-3xl lg:mx-auto mt-2"
            type="submit"
            disabled={btnState}
          >
            {!btnState ? "Confirm code" : "Confirming code..."}
          </Button>
        </form>
      </Form>
    </>
  );
};

export default AppInputOTP;
