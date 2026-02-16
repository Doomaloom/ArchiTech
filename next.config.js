/** @type {import('next').NextConfig} */
const isPreview = process.env.VERCEL_ENV === "preview";
const publicEnv = {};

if (isPreview) {
  publicEnv.NEXT_PUBLIC_BYPASS_AUTH = "true";
  publicEnv.NEXT_PUBLIC_DISABLE_PERSISTENCE = "true";
} else {
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH) {
    publicEnv.NEXT_PUBLIC_BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH;
  }
  if (process.env.NEXT_PUBLIC_DISABLE_PERSISTENCE) {
    publicEnv.NEXT_PUBLIC_DISABLE_PERSISTENCE =
      process.env.NEXT_PUBLIC_DISABLE_PERSISTENCE;
  }
}

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: publicEnv,
};

module.exports = nextConfig;
