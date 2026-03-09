import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const packageJson = require("./package.json");
const buildDate = new Date().toISOString();
const buildId = buildDate.replace(/[-:T]/g, "").slice(0, 12);

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "kdbffqebtazrgwybcsce.supabase.co" },
    ],
  },
};

module.exports = withPWA(nextConfig);
