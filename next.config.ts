import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const buildDate = new Date().toISOString();
const buildId = buildDate.replace(/[-:T]/g, "").slice(0, 12);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildDate,
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kdbffqebtazrgwybcsce.supabase.co" },
    ],
  },
};

module.exports = withPWA(nextConfig);
