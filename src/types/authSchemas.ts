import { z } from "zod";

export const signinValidationSchema = z.object({
  email: z.email({
    message: "Please put in a valid email.",
  }),
  purpose: z.string(),
});

export const verifyOTPSchema = z.object({
  email: z.email(),
  otp: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
  purpose: z.string(),
});
