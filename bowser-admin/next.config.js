/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable this setting to ignore type errors during builds
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
