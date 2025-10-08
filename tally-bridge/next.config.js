// Next.js config in ESM format (package.json has "type": "module")
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  images: { unoptimized: true },
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  turbopack: {}
}

export default nextConfig