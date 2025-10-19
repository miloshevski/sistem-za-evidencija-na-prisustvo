/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',

  // Optional: Configure image optimization for Docker
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
