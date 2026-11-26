/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
