"use server";

import { z } from "zod";
import {
  signinValidationSchema,
  verifyOTPSchema,
} from "@/src/types/authSchemas";
import {
  extractAndThrowLoginError,
  extractAndThrowVerifyOTPError,
} from "@/src/utils/throwErrorFunctions";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || 'https://norma-api.up.railway.app/api/v1';

// login
export async function onSignin(data: z.infer<typeof signinValidationSchema>) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/users/request-otp/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          purpose: "magic_auth" // UPDATED: Changed from "login" to "magic_auth" as per CUSTOMER_FLOW.md
        }),
      }
    );

    const responseData = await res.json();

    if (!res.ok) {
      extractAndThrowLoginError(responseData);
    }

    return responseData;
  } catch (error: any) {
    console.error("Error fetching external data:", error.message);
    return error.message;
  }
}

// ✍ TASK TO DO: TO SECURE TOKENS WITH J.W.T TO PROTECT USER DATA

// verify user registration otp
export async function onVerifyUserOTP(data: z.infer<typeof verifyOTPSchema>) {
  const cookieStore = await cookies();

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/verify-otp/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          otp: data.otp,
          purpose: "magic_auth" // UPDATED: Changed from "login" to "magic_auth" as per CUSTOMER_FLOW.md
        }),
      }
    );
    const responseData = await response.json();

    if (!response.ok) {
      extractAndThrowVerifyOTPError(responseData);
    }

    // setting accesstoken in cookies according to the API documentation
    cookieStore.set("userToken", responseData.data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days
    });

    // Also set refresh token
    cookieStore.set("refreshToken", responseData.data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return responseData;
  } catch (error: any) {
    return error.message;
  }
}
