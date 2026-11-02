import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Product photos come only from our Supabase Storage public bucket.
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/product-images/**",
          },
        ]
      : [],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    // Local Supabase runs on 127.0.0.1; allow it in development only.
    dangerouslyAllowLocalIP: isDev,
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
