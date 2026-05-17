import type { Metadata } from "next";
import { instrumentSans } from "../ui/fonts";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import PWAProvider from "../components/PWA/PWAProvider";
import AuthInit from "../components/AuthInit";
import NotificationProvider from "../components/providers/NotificationProvider";

// Initialize global logger (silences noisy logs in production)
if (typeof window !== "undefined") {
  import("../utils/logger").then((m) => m.initGlobalLogger()).catch(() => {});
}

export { viewport } from "./viewport";

const siteUrl = "https://normaeats.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Norma - Order Fresh Local Food Online",
  description:
    "Order fresh, authentic local cuisine from Norma outlets. Track your food in real-time and get hot meals delivered fast. Browse our menu and order now!",
  applicationName: "Norma",
  keywords: [
    "local food",
    "food delivery",
    "Nigerian cuisine",
    "Norma outlets",
    "online ordering",
    "fast delivery",
    "real-time tracking",
  ],
  authors: [{ name: "Norma Team" }],
  creator: "Norma",
  publisher: "Norma",

  // Reference your existing manifest file
  manifest: "/site.webmanifest",

  // Use your existing icons from manifest
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Open Graph for social media
  openGraph: {
    type: "website",
    siteName: "Norma",
    url: siteUrl,
    title: "Norma - Order Fresh Local Food Online",
    description:
      "Order fresh, authentic local cuisine from Norma outlets. Track your food in real-time and get hot meals delivered fast. Browse our menu and order now!",
    images: [
      {
        url: "/android-chrome-512x512.png", // Use your largest logo
        width: 512,
        height: 512,
        alt: "Norma Logo - Order Fresh Local Food Online",
      },
    ],
  },

  // Twitter cards
  twitter: {
    card: "summary_large_image",
    title: "Norma - Order Fresh Local Food Online",
    description:
      "Order fresh, authentic local cuisine from Norma outlets. Track your food in real-time and get hot meals delivered fast. Browse our menu and order now!",
    images: ["/android-chrome-512x512.png"],
  },

  alternates: {
    canonical: siteUrl,
  },
};

// JSON-LD structured data for Google Search logo
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FoodDeliveryService",
  name: "Norma",
  alternateName: "Norma Food Delivery",
  url: siteUrl,
  logo: `${siteUrl}/android-chrome-512x512.png`,
  description:
    "Order fresh, authentic local cuisine from Norma outlets. Track your food in real-time and get hot meals delivered fast.",
  image: `${siteUrl}/android-chrome-512x512.png`,
};

// Additional Organization structured data (helps with logo in search)
const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Norma",
  url: siteUrl,
  logo: `${siteUrl}/android-chrome-512x512.png`,
  image: `${siteUrl}/android-chrome-512x512.png`,
  description: "Fresh local food delivery service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSans.className} suppressHydrationWarning>
      <head>
        {/* Favicon links */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Theme color for PWA */}
        <meta name="theme-color" content="#FF6B35" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Norma" />

        {/* Additional meta tags for better indexing */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
      </head>
      <body className="pwa-safe-area" suppressHydrationWarning>
        {/* Structured Data for Google Search - moved to body to avoid hydration issues */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          suppressHydrationWarning
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
          suppressHydrationWarning
        />
        <PWAProvider>
          <AuthInit />
          <NotificationProvider>
            {children}
          </NotificationProvider>
          <ToastContainer />
        </PWAProvider>
      </body>
    </html>
  );
}
