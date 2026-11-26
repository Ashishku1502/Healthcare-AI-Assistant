/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    VITE_API_URL: process.env.VITE_API_URL || "",
  },
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
