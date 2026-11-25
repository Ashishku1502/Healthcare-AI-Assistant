/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
