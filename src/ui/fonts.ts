// Avoid using next/font/google at build-time to prevent network fetch timeouts
// during automated builds or CI. Instead export a lightweight object with a
// `className` placeholder that layout.tsx can use. If you want to enable
// Google Fonts again, replace this with next/font/google usage and ensure
// the build environment has outbound network access.

export const dmSans = {
  className: "",
};

import {Instrument_Sans } from "next/font/google";

export const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});