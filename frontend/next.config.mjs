/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
