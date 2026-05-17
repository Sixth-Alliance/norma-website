import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  images: {
    // Use remotePatterns for more control (recommended)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
    ],
    // During local development the Next image optimizer may time out when
    // fetching remote images (Cloudinary). Disable optimization in dev so
    // images are loaded directly and avoid upstream timeouts. Production
    // will still use the optimizer.
    // Enable optimization in production (default behavior)
    // Only disable if specifically debugging image issues
    // unoptimized: false,
  },
};

export default nextConfig;
